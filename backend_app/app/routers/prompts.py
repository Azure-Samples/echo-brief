from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional, List
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


class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: str
    created_at: int
    updated_at: int


class SubcategoryBase(BaseModel):
    name: str
    prompts: Dict[str, str]


class SubcategoryCreate(SubcategoryBase):
    category_id: str


class SubcategoryUpdate(SubcategoryBase):
    pass


class SubcategoryResponse(SubcategoryBase):
    id: str
    category_id: str
    created_at: int
    updated_at: int


# Category CRUD operations
@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a new prompt category"""
    try:
        config = AppConfig()
        try:
            cosmos_db = CosmosDB(config)
            logger.debug("CosmosDB client initialized for category creation")
        except DatabaseError as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return {"status": 503, "message": "Database service unavailable"}

        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)

        # Check if category already exists
        existing_category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.name = @name",
            "parameters": [{"name": "@name", "value": category.name}],
        }
        existing_categories = list(
            cosmos_db.prompts_container.query_items(
                query=existing_category_query["query"],
                parameters=existing_category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if existing_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Category with name '{category.name}' already exists",
            )

        category_id = f"category_{timestamp}"
        category_data = {
            "id": category_id,
            "type": "prompt_category",
            "name": category.name,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        created_category = cosmos_db.prompts_container.create_item(body=category_data)
        return created_category

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create category: {str(e)}",
        )


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all prompt categories"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        query = "SELECT * FROM c WHERE c.type = 'prompt_category'"
        categories = list(
            cosmos_db.prompts_container.query_items(
                query=query,
                enable_cross_partition_query=True,
            )
        )

        return categories

    except Exception as e:
        logger.error(f"Error listing categories: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list categories: {str(e)}",
        )


@router.get("/categories/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get a specific prompt category"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": category_id}],
        }

        categories = list(
            cosmos_db.prompts_container.query_items(
                query=query["query"],
                parameters=query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            raise HTTPException(
                status_code=404,
                detail=f"Category with id '{category_id}' not found",
            )

        return categories[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve category: {str(e)}",
        )


@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update a prompt category"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        # Check if category exists
        query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": category_id}],
        }

        categories = list(
            cosmos_db.prompts_container.query_items(
                query=query["query"],
                parameters=query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            raise HTTPException(
                status_code=404,
                detail=f"Category with id '{category_id}' not found",
            )

        category_data = categories[0]
        category_data["name"] = category.name
        category_data["updated_at"] = int(datetime.now(timezone.utc).timestamp() * 1000)

        updated_category = cosmos_db.prompts_container.upsert_item(body=category_data)
        return updated_category

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update category: {str(e)}",
        )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete a prompt category and all its subcategories"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        # Delete all subcategories first
        subcategories_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.category_id = @category_id",
            "parameters": [{"name": "@category_id", "value": category_id}],
        }

        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=subcategories_query["query"],
                parameters=subcategories_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        for subcategory in subcategories:
            cosmos_db.prompts_container.delete_item(
                item=subcategory["id"],
                partition_key=subcategory["id"],
            )

        # Delete the category
        try:
            cosmos_db.prompts_container.delete_item(
                item=category_id,
                partition_key=category_id,
            )
        except Exception as e:
            if "404" in str(e):
                raise HTTPException(
                    status_code=404,
                    detail=f"Category with id '{category_id}' not found",
                )
            raise

        return {
            "status": 200,
            "message": f"Category '{category_id}' and its subcategories deleted successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete category: {str(e)}",
        )


# Subcategory CRUD operations
@router.post("/subcategories", response_model=SubcategoryResponse)
async def create_subcategory(
    subcategory: SubcategoryCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create a new prompt subcategory"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        # Check if category exists
        category_query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_category' AND c.id = @id",
            "parameters": [{"name": "@id", "value": subcategory.category_id}],
        }

        categories = list(
            cosmos_db.prompts_container.query_items(
                query=category_query["query"],
                parameters=category_query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not categories:
            raise HTTPException(
                status_code=404,
                detail=f"Category with id '{subcategory.category_id}' not found",
            )

        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        subcategory_id = f"subcategory_{timestamp}_{subcategory.name}"

        subcategory_data = {
            "id": subcategory_id,
            "type": "prompt_subcategory",
            "category_id": subcategory.category_id,
            "name": subcategory.name,
            "prompts": subcategory.prompts,
            "created_at": timestamp,
            "updated_at": timestamp,
        }

        created_subcategory = cosmos_db.prompts_container.create_item(
            body=subcategory_data
        )
        return created_subcategory

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating subcategory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create subcategory: {str(e)}",
        )


@router.get("/subcategories", response_model=List[SubcategoryResponse])
async def list_subcategories(
    category_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all prompt subcategories, optionally filtered by category_id"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        if category_id:
            query = {
                "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.category_id = @category_id",
                "parameters": [{"name": "@category_id", "value": category_id}],
            }
            subcategories = list(
                cosmos_db.prompts_container.query_items(
                    query=query["query"],
                    parameters=query["parameters"],
                    enable_cross_partition_query=True,
                )
            )
        else:
            query = "SELECT * FROM c WHERE c.type = 'prompt_subcategory'"
            subcategories = list(
                cosmos_db.prompts_container.query_items(
                    query=query,
                    enable_cross_partition_query=True,
                )
            )

        return subcategories

    except Exception as e:
        logger.error(f"Error listing subcategories: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list subcategories: {str(e)}",
        )


@router.get("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
async def get_subcategory(
    subcategory_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get a specific prompt subcategory"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.id = @id",
            "parameters": [{"name": "@id", "value": subcategory_id}],
        }

        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=query["query"],
                parameters=query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not subcategories:
            raise HTTPException(
                status_code=404,
                detail=f"Subcategory with id '{subcategory_id}' not found",
            )

        return subcategories[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving subcategory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve subcategory: {str(e)}",
        )


@router.put("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
async def update_subcategory(
    subcategory_id: str,
    subcategory: SubcategoryUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update a prompt subcategory"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        # Check if subcategory exists
        query = {
            "query": "SELECT * FROM c WHERE c.type = 'prompt_subcategory' AND c.id = @id",
            "parameters": [{"name": "@id", "value": subcategory_id}],
        }

        subcategories = list(
            cosmos_db.prompts_container.query_items(
                query=query["query"],
                parameters=query["parameters"],
                enable_cross_partition_query=True,
            )
        )

        if not subcategories:
            raise HTTPException(
                status_code=404,
                detail=f"Subcategory with id '{subcategory_id}' not found",
            )

        subcategory_data = subcategories[0]
        subcategory_data["name"] = subcategory.name
        subcategory_data["prompts"] = subcategory.prompts
        subcategory_data["updated_at"] = int(
            datetime.now(timezone.utc).timestamp() * 1000
        )

        updated_subcategory = cosmos_db.prompts_container.upsert_item(
            body=subcategory_data
        )
        return updated_subcategory

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subcategory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update subcategory: {str(e)}",
        )


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(
    subcategory_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Delete a prompt subcategory"""
    try:
        config = AppConfig()
        cosmos_db = CosmosDB(config)

        try:
            cosmos_db.prompts_container.delete_item(
                item=subcategory_id,
                partition_key=subcategory_id,
            )
        except Exception as e:
            if "404" in str(e):
                raise HTTPException(
                    status_code=404,
                    detail=f"Subcategory with id '{subcategory_id}' not found",
                )
            raise

        return {
            "status": 200,
            "message": f"Subcategory '{subcategory_id}' deleted successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting subcategory: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete subcategory: {str(e)}",
        )


# Hierarchical API for retrieving all data
class PromptSubcategoryResponse(BaseModel):
    subcategory_name: str
    subcategory_id: str
    prompts: Dict[str, str]


class PromptCategoryResponse(BaseModel):
    category_name: str
    category_id: str
    subcategories: List[PromptSubcategoryResponse]


class AllPromptsResponse(BaseModel):
    status: int
    data: List[PromptCategoryResponse]


@router.get("/retrieve_prompts", response_model=AllPromptsResponse)
async def retrieve_prompts(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieve all prompts, categories, and subcategories in a hierarchical structure"""
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
