"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { 
  fetchPromptCategories, 
  createPromptCategory,
  deletePrompt as apiDeletePrompt,
  deleteCategory as apiDeleteCategory,
  deleteSubcategory as apiDeleteSubcategory
} from "@/lib/promptManagementApi"

// Interfaces for API data structure
export interface APIPrompt {
  [key: string]: string
}

export interface APISubcategory {
  subcategory_name: string
  subcategory_id: string
  prompts: APIPrompt
}

export interface APICategory {
  category_name: string
  category_id: string
  subcategories: APISubcategory[]
}

// Interfaces for internal data structure
export interface PromptVersion {
  id: string
  content: string
  timestamp: number
  comment?: string
}

export interface Prompt {
  id: string
  title: string
  content: string
  category: string
  subcategory: string
  versions: PromptVersion[]
}

export interface Subcategory {
  id: string
  name: string
  prompts: Prompt[]
}

export interface Category {
  id: string
  name: string
  subcategories: Subcategory[]
}

interface PromptManagementContextType {
  categories: Category[]
  selectedCategory: string | null
  selectedSubcategory: string | null
  selectedPrompt: Prompt | null
  loading: boolean
  error: string | null
  setSelectedCategory: (categoryId: string | null) => void
  setSelectedSubcategory: (subcategoryId: string | null) => void
  setSelectedPrompt: (prompt: Prompt | null) => void
  fetchCategories: () => Promise<void>
  addCategory: (name: string) => Promise<void>
  addSubcategory: (categoryId: string, name: string) => Promise<void>
  addPrompt: (categoryId: string, subcategoryId: string, prompt: { title: string, content: string, category: string, subcategory: string }) => Promise<void>
  updatePrompt: (promptId: string, content: string, comment?: string) => Promise<void>
  deletePrompt: (promptId: string) => Promise<void>
  deleteCategory: (categoryId: string) => Promise<void>
  deleteSubcategory: (categoryId: string, subcategoryId: string) => Promise<void>
}

const PromptManagementContext = createContext<PromptManagementContextType | undefined>(undefined)

// Helper function to convert API data structure to internal data structure
function convertAPIToInternalCategories(apiCategories: APICategory[]): Category[] {
  return apiCategories.map(apiCategory => ({
    id: apiCategory.category_id,
    name: apiCategory.category_name,
    subcategories: apiCategory.subcategories.map(apiSubcategory => ({
      id: apiSubcategory.subcategory_id,
      name: apiSubcategory.subcategory_name,
      prompts: Object.entries(apiSubcategory.prompts || {}).map(([key, value]) => ({
        id: `${apiSubcategory.subcategory_id}_${key}`,
        title: key,
        content: value,
        category: apiCategory.category_id,
        subcategory: apiSubcategory.subcategory_id,
        versions: [
          {
            id: `${apiSubcategory.subcategory_id}_${key}_v1`,
            content: value,
            timestamp: Date.now()
          }
        ]
      }))
    }))
  }))
}

// Helper function to convert internal data structure to API data structure for saving
function convertInternalToAPICategory(category: Category): any {
  return {
    name: category.name,
    subcategories: Object.fromEntries(
      category.subcategories.map(subcategory => [
        subcategory.name,
        Object.fromEntries(
          subcategory.prompts.map(prompt => [
            prompt.title,
            prompt.content
          ])
        )
      ])
    )
  }
}

export function PromptManagementProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const initialFetchDone = useRef(false)

  // Fetch categories from API - remove toast from dependencies to prevent re-renders
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const apiCategories = await fetchPromptCategories()
      const internalCategories = convertAPIToInternalCategories(apiCategories)
      setCategories(internalCategories)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching categories'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Remove toast from dependencies

  // Load categories on mount only once
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true
      fetchCategories()
    }
  }, [fetchCategories])

  // Add a new category
  const addCategory = useCallback(async (name: string) => {
    setError(null);
    
    // Generate a temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    
    // Create new category locally
    const newCategory: Category = {
      id: tempId,
      name,
      subcategories: []
    };
    
    // Optimistically update the UI immediately
    setCategories(prev => [...prev, newCategory]);
    
    // Show a temporary success notification
    toast({
      title: "Adding category...",
      description: `Creating "${name}" category`,
    });
    
    // Then make the API call in the background
    try {
      // Create new category with empty subcategories
      const newCategoryData = {
        name,
        subcategories: {}
      };
      
      await createPromptCategory(newCategoryData);
      
      // Refresh categories from API to get the real ID
      await fetchCategories();
      
      toast({
        title: "Success",
        description: `Category "${name}" created successfully`,
      });
    } catch (err) {
      // If the API call fails, revert the optimistic update
      setCategories(prev => prev.filter(c => c.id !== tempId));
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while adding the category';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [fetchCategories, toast]);

  // Add a new subcategory to a category
  const addSubcategory = useCallback(async (categoryId: string, name: string) => {
    setError(null);
    
    // Find the category for optimistic update
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      toast({
        title: "Error",
        description: `Category with ID ${categoryId} not found`,
        variant: "destructive"
      });
      return;
    }
    
    // Generate temporary ID
    const tempId = `temp_${Date.now()}`;
    
    // Optimistically update UI immediately
    const updatedCategories = categories.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          subcategories: [
            ...c.subcategories,
            {
              id: tempId,
              name,
              prompts: []
            }
          ]
        };
      }
      return c;
    });
    
    setCategories(updatedCategories);
    
    // Show temporary notification
    toast({
      title: "Adding subcategory...",
      description: `Creating "${name}" subcategory`,
    });
    
    // Make API call in background
    try {
      // Convert to API format
      const apiCategory = convertInternalToAPICategory({
        ...category,
        subcategories: [
          ...category.subcategories,
          {
            id: tempId,
            name,
            prompts: []
          }
        ]
      });
      
      await createPromptCategory(apiCategory);
      
      // Refresh to get real IDs
      await fetchCategories();
      
      toast({
        title: "Success",
        description: `Subcategory "${name}" created successfully`,
      });
    } catch (err) {
      // Revert optimistic update on error
      setCategories(categories);
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while adding the subcategory';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [categories, fetchCategories, toast]);

  // Add a new prompt to a subcategory
  const addPrompt = useCallback(async (categoryId: string, subcategoryId: string, prompt: { title: string, content: string, category: string, subcategory: string }) => {
    setLoading(true)
    setError(null)
    try {
      // Find the category and subcategory
      const category = categories.find(c => c.id === categoryId)
      if (!category) {
        throw new Error(`Category with ID ${categoryId} not found`)
      }
      
      const subcategory = category.subcategories.find(s => s.id === subcategoryId)
      if (!subcategory) {
        throw new Error(`Subcategory with ID ${subcategoryId} not found`)
      }
      
      // Create a new prompt
      const newPrompt = {
        id: `temp_${Date.now()}`, // Temporary ID, will be replaced by API response
        title: prompt.title,
        content: prompt.content,
        category: categoryId,
        subcategory: subcategoryId,
        versions: [
          {
            id: `temp_${Date.now()}_v1`,
            content: prompt.content,
            timestamp: Date.now()
          }
        ]
      }
      
      // Add the prompt to the subcategory
      const updatedCategory = {
        ...category,
        subcategories: category.subcategories.map(s => {
          if (s.id === subcategoryId) {
            return {
              ...s,
              prompts: [...s.prompts, newPrompt]
            }
          }
          return s
        })
      }
      
      // Convert to API format and send
      const apiCategory = convertInternalToAPICategory(updatedCategory)
      await createPromptCategory(apiCategory)
      
      // Refresh categories from API to get the new prompt with its ID
      await fetchCategories()
      
      toast({
        title: "Success",
        description: `Prompt "${prompt.title}" created successfully`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while adding the prompt'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [categories, fetchCategories, toast])

  // Update an existing prompt
  const updatePrompt = useCallback(async (promptId: string, content: string, comment?: string) => {
    setLoading(true)
    setError(null)
    try {
      // Find the prompt in the categories
      let updatedCategories = [...categories]
      let found = false
      
      for (let i = 0; i < updatedCategories.length; i++) {
        const category = updatedCategories[i]
        for (let j = 0; j < category.subcategories.length; j++) {
          const subcategory = category.subcategories[j]
          for (let k = 0; k < subcategory.prompts.length; k++) {
            const prompt = subcategory.prompts[k]
            if (prompt.id === promptId) {
              // Update the prompt
              const updatedPrompt = {
                ...prompt,
                content,
                versions: [
                  {
                    id: `${prompt.id}_v${prompt.versions.length + 1}`,
                    content,
                    timestamp: Date.now(),
                    comment
                  },
                  ...prompt.versions
                ]
              }
              
              // Update the prompt in the subcategory
              subcategory.prompts[k] = updatedPrompt
              found = true
              break
            }
          }
          if (found) break
        }
        if (found) break
      }
      
      if (!found) {
        throw new Error(`Prompt with ID ${promptId} not found`)
      }
      
      // Convert the updated category to API format and send
      const category = updatedCategories.find(c => 
        c.subcategories.some(s => 
          s.prompts.some(p => p.id === promptId)
        )
      )
      
      if (!category) {
        throw new Error(`Category for prompt ${promptId} not found`)
      }
      
      const apiCategory = convertInternalToAPICategory(category)
      await createPromptCategory(apiCategory)
      
      // Update the local state
      setCategories(updatedCategories)
      
      toast({
        title: "Success",
        description: "Prompt updated successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating the prompt'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [categories, toast])

  // Delete a prompt
  const deletePrompt = useCallback(async (promptId: string) => {
    setError(null);
    
    // Use a more efficient way to find the prompt
    let foundPrompt = null;
    let categoryIndex = -1;
    let subcategoryIndex = -1;
    let promptIndex = -1;
    
    // This is more efficient than the nested loops with breaks
    outerLoop: 
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      for (let j = 0; j < category.subcategories.length; j++) {
        const subcategory = category.subcategories[j];
        for (let k = 0; k < subcategory.prompts.length; k++) {
          const prompt = subcategory.prompts[k];
          if (prompt.id === promptId) {
            foundPrompt = {
              categoryId: category.id,
              subcategoryId: subcategory.id,
              promptKey: prompt.title
            };
            categoryIndex = i;
            subcategoryIndex = j;
            promptIndex = k;
            break outerLoop;
          }
        }
      }
    }
    
    if (!foundPrompt) {
      setError(`Prompt with ID ${promptId} not found`);
      return; // Return early instead of throwing
    }
    
    try {
      // Call the API to delete the prompt
      await apiDeletePrompt(
        foundPrompt.categoryId,
        foundPrompt.subcategoryId,
        foundPrompt.promptKey
      );
      
      // Update state more efficiently
      // Don't create a whole new categories array if we can avoid it
      const updatedCategories = [...categories];
      const updatedSubcategories = [...updatedCategories[categoryIndex].subcategories];
      const updatedPrompts = [...updatedSubcategories[subcategoryIndex].prompts];
      
      // Remove the prompt
      updatedPrompts.splice(promptIndex, 1);
      updatedSubcategories[subcategoryIndex] = {
        ...updatedSubcategories[subcategoryIndex],
        prompts: updatedPrompts
      };
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        subcategories: updatedSubcategories
      };
      
      setCategories(updatedCategories);
      
      toast({
        title: "Success",
        description: "Prompt deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting the prompt';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [categories, toast]);

  // Delete a category
  const deleteCategory = useCallback(async (categoryId: string) => {
    setError(null);
    
    // Find the category index
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      setError(`Category with ID ${categoryId} not found`);
      return; // Return early instead of throwing
    }
    
    try {
      // Call the API to delete the category
      await apiDeleteCategory(categoryId);
      
      // Update state efficiently
      const updatedCategories = [...categories];
      updatedCategories.splice(categoryIndex, 1);
      setCategories(updatedCategories);
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting the category';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [categories, toast]);
  
  //deleteSubcategory function
  const deleteSubcategory = useCallback(async (categoryId: string, subcategoryId: string) => {
    setError(null);
    
    // Find the indices
    const categoryIndex = categories.findIndex(c => c.id === categoryId);
    
    if (categoryIndex === -1) {
      setError(`Category with ID ${categoryId} not found`);
      return;
    }
    
    const subcategoryIndex = categories[categoryIndex].subcategories.findIndex(
      s => s.id === subcategoryId
    );
    
    if (subcategoryIndex === -1) {
      setError(`Subcategory with ID ${subcategoryId} not found`);
      return;
    }
    
    try {
      // Call the API to delete the subcategory
      await apiDeleteSubcategory(categoryId, subcategoryId);
      
      // Update state efficiently
      const updatedCategories = [...categories];
      const updatedSubcategories = [...updatedCategories[categoryIndex].subcategories];
      updatedSubcategories.splice(subcategoryIndex, 1);
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        subcategories: updatedSubcategories
      };
      
      setCategories(updatedCategories);
      
      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while deleting the subcategory';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [categories, toast]);

  return (
    <PromptManagementContext.Provider value={{
      categories,
      selectedCategory,
      selectedSubcategory,
      selectedPrompt,
      loading,
      error,
      setSelectedCategory,
      setSelectedSubcategory,
      setSelectedPrompt,
      fetchCategories,
      addCategory,
      addSubcategory,
      addPrompt,
      updatePrompt,
      deletePrompt,
      deleteCategory,
      deleteSubcategory
    }}>
      {children}
    </PromptManagementContext.Provider>
  )
}

export function usePromptManagement() {
  const context = useContext(PromptManagementContext)
  if (context === undefined) {
    throw new Error('usePromptManagement must be used within a PromptManagementProvider')
  }
  return context
}