from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime, timezone

from app.core.config import AppConfig, CosmosDB, DatabaseError
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
router = APIRouter()


class PromptKey(BaseModel):
    key: str
    prompt: str


class Subcategory(BaseModel):
    name: str
    prompts: Dict[str, str]


class Category(BaseModel):
    name: str
    subcategories: Dict[str, Dict[str, str]]


from fastapi import HTTPException, Depends
from datetime import datetime, timezone
from typing import Dict, Any


class DeletePromptRequest(BaseModel):
    category_id: str
    subcategory_id: str
    prompt_key: str



@router.post("/create_prompt")
async def create_prompt(
    category: Category,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create or update a prompt category with its subcategories and prompts"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug("CosmosDB client initialized for upload")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)

        # Check if the category already exists
        existing_category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.name = @name",
            "parameters": [{"name": "@name", "value": category.name}],
        }
        existing_categories = list(
            cosmos_db.prompts_container.query_items(  # Use prompts_container
                query=existing_category_query["query"],
                parameters=existing_category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if existing_categories:
            category_data = existing_categories[0]
            category_id = category_data["id"]
            category_data["updated_at"] = timestamp
            cosmos_db.prompts_container.upsert_item(
                category_data
            )  # Use prompts_container
        else:
            category_id = f"category_{timestamp}"
            category_data = {
                "id": category_id,
                "type": "prompt_category",
                "name": category.name,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            cosmos_db.prompts_container.upsert_item(
                category_data
            )  # Use prompts_container

        # Process subcategories and prompts
        for subcategory_name, prompts in category.subcategories.items():
            subcategory_query = {
                "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.category_id = @category_id AND c.name = @name",
                "parameters": [
                    {"name": "@category_id", "value": category_id},
                    {"name": "@name", "value": subcategory_name},
                ],
            }
            existing_subcategories = list(
                cosmos_db.prompts_container.query_items(  # Use prompts_container
                    query=subcategory_query["query"],
                    parameters=subcategory_query["parameters"],
                    enable_cross_partition_query=True,
                )
            )

            if existing_subcategories:
                subcategory_data = existing_subcategories[0]
                subcategory_id = subcategory_data["id"]
                subcategory_data["updated_at"] = timestamp
                for prompt_key, prompt_text in prompts.items():
                    subcategory_data["prompts"][prompt_key] = (
                        prompt_text  # Update or add prompt
                    )
                cosmos_db.prompts_container.upsert_item(
                    subcategory_data
                )  # Use prompts_container
            else:
                subcategory_id = f"subcategory_{timestamp}_{subcategory_name}"
                subcategory_data = {
                    "id": subcategory_id,
                    "type": "prompt_subcategory",
                    "category_id": category_id,
                    "name": subcategory_name,
                    "prompts": {key: text for key, text in prompts.items()},
                    "created_at": timestamp,
                    "updated_at": timestamp,
                }
                cosmos_db.prompts_container.upsert_item(
                    subcategory_data
                )  # Use prompts_container

        return {
            "status": 200,
            "message": f"Category '{category.name}' processed successfully",
            "category_id": category_id,
        }

    except Exception as e:
        logger.error(f"Error processing prompt category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process prompt category: {str(e)}",
        )


@router.get("/retrieve_prompts")
async def retrieve_prompts(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve all prompts, categories, and subcategories"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug("CosmosDB client initialized for retrieval")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        # Query all categories
        categories_query = "SELECT * FROM c WHERE c.type = 'prompt_category'"
        categories = list(
            cosmos_db.prompts_container.query_items(
                query=categories_query, enable_cross_partition_query=True
            )
        )

        # Query all subcategories
        subcategories_query = "SELECT * FROM c WHERE c.type = 'prompt_subcategory'"
        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=subcategories_query, enable_cross_partition_query=True
            )
        )

        # Organize data
        results = []
        for category in categories:
            category_data = {
                "category_name": category["name"],
                "category_id": category["id"],
                "subcategories": [],
            }
            for subcategory in subcategories:
                if subcategory["category_id"] == category["id"]:
                    category_data["subcategories"].append(
                        {
                            "subcategory_name": subcategory["name"],
                            "subcategory_id": subcategory["id"],
                            "prompts": subcategory["prompts"],
                        }
                    )
            results.append(category_data)

        return {"status": 200, "data": results}

    except Exception as e:
        logger.error(f"Error retrieving prompts: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve prompts: {str(e)}",
        )


@router.delete("/delete_prompt")
async def delete_prompt(
    request: DeletePromptRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete a prompt from a subcategory"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug("CosmosDB client initialized for delete prompt")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        # Get the category
        category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": request.category_id}],
        }
        categories = list(
            cosmos_db.prompts_container.query_items(
                query=category_query["query"],
                parameters=category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            return {
                "status": 404,
                "message": f"Category with ID {request.category_id} not found",
            }

        # Get the subcategory
        subcategory_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.id = @id AND c.category_id = @category_id",
            "parameters": [
                {"name": "@id", "value": request.subcategory_id},
                {"name": "@category_id", "value": request.category_id},
            ],
        }
        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=subcategory_query["query"],
                parameters=subcategory_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not subcategories:
            return {
                "status": 404,
                "message": f"Subcategory with ID {request.subcategory_id} not found",
            }

        subcategory = subcategories[0]

        # Check if the prompt exists
        if request.prompt_key not in subcategory.get("prompts", {}):
            return {
                "status": 404,
                "message": f"Prompt with key '{request.prompt_key}' not found",
            }

        # Remove the prompt
        subcategory_prompts = subcategory.get("prompts", {})
        del subcategory_prompts[request.prompt_key]

        # Update the subcategory
        subcategory["prompts"] = subcategory_prompts
        subcategory["updated_at"] = int(datetime.now(timezone.utc).timestamp() * 1000)
        
        cosmos_db.prompts_container.upsert_item(subcategory)

        return {
            "status": 200,
            "message": f"Prompt '{request.prompt_key}' deleted successfully",
            "category_id": request.category_id,
            "subcategory_id": request.subcategory_id,
        }

    except Exception as e:
        logger.error(f"Error deleting prompt: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete prompt: {str(e)}",
        )
    
@router.delete("/delete_category")
async def delete_category(
    category_id: str = Query(..., description="ID of the category to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete a category and all its subcategories"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug(f"CosmosDB client initialized for deleting category {category_id}")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        # Check if the category exists
        category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": category_id}],
        }
        categories = list(
            cosmos_db.prompts_container.query_items(
                query=category_query["query"],
                parameters=category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            return {
                "status": 404,
                "message": f"Category with ID {category_id} not found",
            }

        # Get all subcategories for this category
        subcategory_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.category_id = @category_id",
            "parameters": [{"name": "@category_id", "value": category_id}],
        }
        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=subcategory_query["query"],
                parameters=subcategory_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        # Delete each subcategory
        for subcategory in subcategories:
            logger.debug(f"Deleting subcategory {subcategory['id']}")
            cosmos_db.prompts_container.delete_item(
                item=subcategory["id"],
                partition_key=subcategory["id"]
            )

        # Delete the category
        logger.debug(f"Deleting category {category_id}")
        cosmos_db.prompts_container.delete_item(
            item=category_id,
            partition_key=category_id
        )

        return {
            "status": 200,
            "message": f"Category '{category_id}' and all subcategories deleted successfully",
        }

    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete category: {str(e)}",
        )


@router.delete("/delete_subcategory")
async def delete_subcategory(
    category_id: str = Query(..., description="ID of the parent category"),
    subcategory_id: str = Query(..., description="ID of the subcategory to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete a subcategory and all its prompts"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug(f"CosmosDB client initialized for deleting subcategory {subcategory_id}")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        # Check if the category exists
        category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": category_id}],
        }
        categories = list(
            cosmos_db.prompts_container.query_items(
                query=category_query["query"],
                parameters=category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            return {
                "status": 404,
                "message": f"Category with ID {category_id} not found",
            }

        # Check if the subcategory exists
        subcategory_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.id = @id AND c.category_id = @category_id",
            "parameters": [
                {"name": "@id", "value": subcategory_id},
                {"name": "@category_id", "value": category_id},
            ],
        }
        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=subcategory_query["query"],
                parameters=subcategory_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not subcategories:
            return {
                "status": 404,
                "message": f"Subcategory with ID {subcategory_id} not found",
            }

        # Delete the subcategory
        logger.debug(f"Deleting subcategory {subcategory_id}")
        cosmos_db.prompts_container.delete_item(
            item=subcategory_id,
            partition_key=subcategory_id
        )

        return {
            "status": 200,
            "message": f"Subcategory '{subcategory_id}' deleted successfully",
        }

    except Exception as e:
        logger.error(f"Error deleting subcategory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete subcategory: {str(e)}",
        )