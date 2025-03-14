import { BASE_URL, PROMPTS_API, CREATE_PROMPT_API } from "./apiConstants";

// Define the endpoints for delete operations
const DELETE_PROMPT_API = `${BASE_URL}/delete_prompt`;
const DELETE_CATEGORY_API = `${BASE_URL}/delete_category`;
const DELETE_SUBCATEGORY_API = `${BASE_URL}/delete_subcategory`;

export interface Prompt {
  [key: string]: string;
}

export interface Subcategory {
  subcategory_name: string;
  subcategory_id: string;
  prompts: Prompt;
}

export interface Category {
  category_name: string;
  category_id: string;
  subcategories: Subcategory[];
}

export interface PromptsResponse {
  status: number;
  data: Category[];
}

/**
 * Fetches all prompt categories from the API
 * @returns Promise<Category[]> Array of categories
 */
export async function fetchPromptCategories(): Promise<Category[]> {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(PROMPTS_API, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: PromptsResponse = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching prompt categories:", error);
    throw error;
  }
}

/**
 * Creates or updates a prompt category
 * @param categoryData Object containing category name and subcategories
 * @returns Promise<any> API response
 */
export async function createPromptCategory(categoryData: { 
  name: string; 
  subcategories: Record<string, Record<string, string>>; 
}): Promise<any> {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    // Convert from our frontend format to the API's expected format
    const apiCategoryData = {
      name: categoryData.name,
      subcategories: categoryData.subcategories
    };

    const response = await fetch(CREATE_PROMPT_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiCategoryData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating/updating prompt category:", error);
    throw error;
  }
}

/**
 * Deletes a prompt
 * @param categoryId The ID of the category
 * @param subcategoryId The ID of the subcategory
 * @param promptKey The key of the prompt to delete
 * @returns Promise<any> API response
 */
export async function deletePrompt(
  categoryId: string,
  subcategoryId: string,
  promptKey: string
): Promise<any> {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(DELETE_PROMPT_API, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category_id: categoryId,
        subcategory_id: subcategoryId,
        prompt_key: promptKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting prompt:", error);
    throw error;
  }
}

/**
 * Deletes a category and all its subcategories
 * @param categoryId The ID of the category to delete
 * @returns Promise<any> API response
 */
export async function deleteCategory(categoryId: string): Promise<any> {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(`${DELETE_CATEGORY_API}?category_id=${categoryId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

/**
 * Deletes a subcategory and all its prompts
 * @param categoryId The ID of the parent category
 * @param subcategoryId The ID of the subcategory to delete
 * @returns Promise<any> API response
 */
export async function deleteSubcategory(
  categoryId: string,
  subcategoryId: string
): Promise<any> {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(
      `${DELETE_SUBCATEGORY_API}?category_id=${categoryId}&subcategory_id=${subcategoryId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    throw error;
  }
}