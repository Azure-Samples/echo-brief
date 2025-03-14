import os
import logging
from typing import Dict, Any
from dotenv import load_dotenv
from azure.cosmos.exceptions import CosmosHttpResponseError
from azure.identity import DefaultAzureCredential, CredentialUnavailableError
from azure.cosmos import PartitionKey
import azure.cosmos.cosmos_client as cosmos_client

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Ensure logs are visible on the console
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)


def get_required_env_var(var_name: str) -> str:
    """Get a required environment variable or raise an error with a helpful message"""
    value = os.getenv(var_name)
    if not value:
        logger.error(f"Required environment variable {var_name} is not set")
        raise ValueError(f"Required environment variable {var_name} is not set")
    return value


class StorageConfig:
    def __init__(self, account_url: str, recordings_container: str):
        self.account_url = account_url
        self.recordings_container = recordings_container


class AppConfig:
    def __init__(self):
        logger.debug("Initializing AppConfig")
        try:
            # Get the prefix first
            prefix = os.getenv("AZURE_COSMOS_DB_PREFIX", "voice_")

            # Initialize cosmos configuration
            self.cosmos = {
                "endpoint": get_required_env_var("AZURE_COSMOS_ENDPOINT"),
                "database": os.getenv("AZURE_COSMOS_DB", "VoiceDB"),
                "containers": {
                    "auth": f"{prefix}auth",
                    "jobs": f"{prefix}jobs",
                    "prompts": f"{prefix}prompts",
                },
            }
            logger.debug(f"Cosmos config initialized: {self.cosmos}")

            # Initialize auth configuration
            self.auth = {
                "jwt_secret_key": get_required_env_var("JWT_SECRET_KEY"),
                "jwt_algorithm": "HS256",
                "jwt_access_token_expire_minutes": int(
                    os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
                ),
            }

            # Initialize storage configuration
            self.storage = StorageConfig(
                account_url=get_required_env_var("AZURE_STORAGE_ACCOUNT_URL"),
                recordings_container=get_required_env_var(
                    "AZURE_STORAGE_RECORDINGS_CONTAINER"
                ),
            )

            logger.debug("AppConfig initialization completed successfully")
        except Exception as e:
            logger.error(f"Error initializing AppConfig: {str(e)}")
            raise


class DatabaseError(Exception):
    """Custom exception for database errors"""

    pass


class CosmosDB:
    def __init__(self, config: AppConfig):
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)

        self.config = config

        # Always use DefaultAzureCredential
        try:
            credential = DefaultAzureCredential(logging_enable=True)
            self.logger.debug("DefaultAzureCredential initialized successfully")

        except CredentialUnavailableError as e:
            self.logger.error(f"Credential unavailable: {str(e)}")
            raise DatabaseError(
                "Failed to authenticate with Azure: Credential unavailable."
            )
        except Exception as e:
            self.logger.error(f"Unexpected error during authentication: {str(e)}")
            raise DatabaseError(f"Authentication error: {str(e)}")

        try:
            self.client = cosmos_client.CosmosClient(
                url=config.cosmos["endpoint"], credential=credential
            )

            # Create database if it doesn't exist
            database_name = config.cosmos["database"]
            self.database = self.client.get_database_client(database_name)
            self.logger.info(f"Database {database_name} is ready")

            # Create containers if they don't exist
            containers = config.cosmos["containers"]

            # Auth container
            auth_container_name = containers["auth"]
            self.auth_container = self.database.get_container_client(
                auth_container_name
            )
            self.logger.info(f"Auth container {auth_container_name} is ready")

            # Jobs container
            jobs_container_name = containers["jobs"]
            self.jobs_container = self.database.get_container_client(
                jobs_container_name
            )
            self.logger.info(f"Jobs container {jobs_container_name} is ready")

            # Prompts container
            prompts_container_name = containers["prompts"]
            self.prompts_container = self.database.get_container_client(
                prompts_container_name
            )
            self.logger.info(f"Prompts container {prompts_container_name} is ready")

        except KeyError as e:
            self.logger.error(f"Missing configuration key: {str(e)}")
            raise
        except CosmosHttpResponseError as e:
            self.logger.error(f"Cosmos DB HTTP error: {str(e)}")
            raise DatabaseError(f"Cosmos DB error: {str(e)}")
        except Exception as e:
            self.logger.error(f"Error initializing Cosmos DB: {str(e)}")
            raise

    async def get_user_by_email(self, email: str):
        try:
            query = "SELECT * FROM c WHERE c.type = 'user' AND c.email = @email"
            parameters = [{"name": "@email", "value": email}]
            results = list(
                self.auth_container.query_items(
                    query=query,
                    parameters=parameters,
                    enable_cross_partition_query=True,
                )
            )
            return results[0] if results else None
        except Exception as e:
            self.logger.error(f"Error retrieving user: {str(e)}")
            raise

    async def create_user(self, user_data: dict):
        try:
            user_data["type"] = "user"
            return self.auth_container.create_item(body=user_data)
        except Exception as e:
            self.logger.error(f"Error creating user: {str(e)}")
            raise

    def create_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            job_data["type"] = "job"
            return self.jobs_container.create_item(body=job_data)
        except Exception as e:
            self.logger.error(f"Error creating job: {str(e)}")
            raise

    def get_job(self, job_id: str) -> Dict[str, Any] | None:
        """Get job by ID from jobs container"""
        query = "SELECT * FROM c WHERE c.type = 'job' AND c.id = @id"
        try:
            jobs = list(
                self.jobs_container.query_items(
                    query=query,
                    parameters=[{"name": "@id", "value": job_id}],
                    enable_cross_partition_query=True,
                )
            )
            return jobs[0] if jobs else None
        except Exception as e:
            logger.error(f"Error getting job: {str(e)}")
            raise ValueError(f"Error retrieving job: {str(e)}")

    def update_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update job in jobs container"""
        try:
            return self.jobs_container.upsert_item(body=job_data)
        except Exception as e:
            logger.error(f"Error updating job: {str(e)}")
            raise ValueError(f"Error updating job: {str(e)}")

    def create_prompt_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create prompt category in prompts container"""
        try:
            return self.prompts_container.create_item(body=category_data)
        except Exception as e:
            logger.error(f"Error creating prompt category: {str(e)}")
            raise ValueError(f"Error creating prompt category: {str(e)}")

    def create_prompt_subcategory(
        self, subcategory_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create prompt subcategory in prompts container"""
        try:
            return self.prompts_container.create_item(body=subcategory_data)
        except Exception as e:
            logger.error(f"Error creating prompt subcategory: {str(e)}")
            raise ValueError(f"Error creating prompt subcategory: {str(e)}")


# Create the config instance
config = AppConfig()
