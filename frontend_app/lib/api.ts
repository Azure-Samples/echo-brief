import {
  REGISTER_API,
  LOGIN_API,
  UPLOAD_API,
  CATEGORIES_API,
  SUBCATEGORIES_API,
  PROMPTS_API,
} from "../lib/apiConstants"

interface RegisterResponse {
  status: number
  message: string
}

interface LoginResponse {
  status: number
  message: string
  access_token: string
  token_type: string
}

interface UploadResponse {
  job_id?: string
  status: number | string
  message: string
}

interface Prompt {
  [key: string]: string
}

interface Subcategory {
  subcategory_name: string
  subcategory_id: string
  prompts: Prompt
}

interface Category {
  category_name: string
  category_id: string
  subcategories: Subcategory[]
}

interface PromptsResponse {
  status: number
  data: Category[]
}

interface CategoryResponse {
  category_id: string
  name: string
  created_at: string
  updated_at: string
}

interface SubcategoryResponse {
  id: string
  name: string
  category_id: string
  prompts: Prompt
  created_at: number
  updated_at: number
}

export async function registerUser(email: string, password: string): Promise<RegisterResponse> {
  const response = await fetch(REGISTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(LOGIN_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  })

  const data: LoginResponse = await response.json()

  if (!response.ok) {
    return {
      status: response.status,
      message: data.message || "An error occurred during login",
      access_token: "",
      token_type: "",
    }
  }

  return data
}

export async function uploadFile(
  file: File,
  prompt_category_id: string,
  prompt_subcategory_id: string,
  token: string,
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("prompt_category_id", prompt_category_id)
  formData.append("prompt_subcategory_id", prompt_subcategory_id)

  const response = await fetch(UPLOAD_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const data: UploadResponse = await response.json()

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  }

  return data
}

export async function fetchPrompts(): Promise<PromptsResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const response = await fetch(PROMPTS_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

// New functions for category management
export async function createCategory(name: string): Promise<CategoryResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const response = await fetch(CATEGORIES_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function fetchCategories(): Promise<CategoryResponse[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const response = await fetch(CATEGORIES_API, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function updateCategory(categoryId: string, name: string): Promise<CategoryResponse> {
  if (!categoryId) {
    console.error("Category ID is undefined or empty");
    throw new Error("Invalid category ID. Cannot update category.");
  }

  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  console.log("Updating category with ID:", categoryId);
  console.log("New name:", name);
  console.log("Using token:", token.substring(0, 15) + "...");

  try {
    const response = await fetch(`${CATEGORIES_API}/${categoryId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    console.log("Update category response status:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Authentication failed (401). Token may be invalid or expired.");
        localStorage.removeItem("token"); // Clear invalid token
        throw new Error("Authentication failed. Please log in again.");
      }

      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const response = await fetch(`${CATEGORIES_API}/${categoryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

// Functions for subcategory management
export async function createSubcategory(
  name: string,
  categoryId: string,
  prompts: Record<string, string>,
): Promise<SubcategoryResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const response = await fetch(SUBCATEGORIES_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      category_id: categoryId,
      prompts,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function fetchSubcategories(categoryId?: string): Promise<SubcategoryResponse[]> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  const url = categoryId ? `${SUBCATEGORIES_API}?category_id=${categoryId}` : SUBCATEGORIES_API

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

export async function updateSubcategory(
  subcategoryId: string,
  name: string,
  prompts: Record<string, string>,
): Promise<SubcategoryResponse> {
  const token = localStorage.getItem("token")
  if (!token) {
    throw new Error("No authentication token found. Please log in again.")
  }

  if (!subcategoryId) {
    console.error("Subcategory ID is undefined or empty");
    throw new Error("Invalid subcategory ID. Cannot update subcategory.");
  }

  console.log("Updating subcategory with ID:", subcategoryId);
  console.log("New name:", name);
  console.log("New prompts:", prompts);
  console.log("Using token:", token.substring(0, 15) + "...");

  try {
    const response = await fetch(`${SUBCATEGORIES_API}/${subcategoryId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        prompts,
      }),
    });

    console.log("Update subcategory response status:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Authentication failed (401). Token may be invalid or expired.");
        localStorage.removeItem("token"); // Clear invalid token
        throw new Error("Authentication failed. Please log in again.");
      }

      if (response.status === 404) {
        console.error("Subcategory not found (404).");
        throw new Error("Subcategory not found. It may have been already deleted.");
      }

      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("Update subcategory response:", data);
    return data;
  } catch (error) {
    console.error("Error updating subcategory:", error);
    throw error;
  }
}

export async function deleteSubcategory(subcategoryId: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found. Please log in again.");
  }

  if (!subcategoryId || typeof subcategoryId !== "string") {
    console.error("Invalid subcategory ID:", subcategoryId);
    throw new Error("Invalid subcategory ID. Cannot delete subcategory.");
  }

  console.log("Deleting subcategory with ID:", subcategoryId);
  console.log("Using token:", token.substring(0, 15) + "...");

  try {
    const response = await fetch(`${SUBCATEGORIES_API}/${subcategoryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log("Delete subcategory response status:", response.status);

    if (!response.ok) {
      if (response.status === 401) {
        console.error("Authentication failed (401). Token may be invalid or expired.");
        localStorage.removeItem("token"); // Clear invalid token
        throw new Error("Authentication failed. Please log in again.");
      }

      if (response.status === 404) {
        console.error("Subcategory not found (404).");
        throw new Error("Subcategory not found. It may have been already deleted.");
      }

      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    throw error;
  }
}

