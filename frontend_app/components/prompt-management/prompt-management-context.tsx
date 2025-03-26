"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import {
  fetchCategories,
  fetchSubcategories,
  createCategory,
  createSubcategory,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubcategory,
} from "@/lib/api"

export interface Category {
  category_id: string
  id?: string
  name: string
  created_at?: string
  updated_at?: string
}

export interface Subcategory {
  id: string
  name: string
  category_id: string
  prompts: Record<string, string>
  created_at: number
  updated_at: number
}

interface PromptManagementContextType {
  categories: Category[]
  subcategories: Subcategory[]
  selectedCategory: Category | null
  selectedSubcategory: Subcategory | null
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  setSelectedCategory: (category: Category | null) => void
  setSelectedSubcategory: (subcategory: Subcategory | null) => void
  addCategory: (name: string) => Promise<void>
  addSubcategory: (name: string, categoryId: string, prompts: Record<string, string>) => Promise<void>
  editCategory: (categoryId: string, name: string) => Promise<void>
  editSubcategory: (subcategoryId: string, name: string, prompts: Record<string, string>) => Promise<void>
  removeCategory: (categoryId: string) => Promise<void>
  removeSubcategory: (subcategoryId: string) => Promise<void>
}

const PromptManagementContext = createContext<PromptManagementContextType | undefined>(undefined)

export function PromptManagementProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const categoriesData = await fetchCategories()
      setCategories(categoriesData)

      if (selectedCategory) {
        const subcategoriesData = await fetchSubcategories(selectedCategory.category_id)
        setSubcategories(subcategoriesData)
      } else {
        const allSubcategories = await fetchSubcategories()
        setSubcategories(allSubcategories)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching data")
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  const addCategory = useCallback(
    async (name: string) => {
      setLoading(true)
      setError(null)
      try {
        await createCategory(name)
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while creating category")
        console.error("Error creating category:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData],
  )

  const addSubcategory = useCallback(
    async (name: string, categoryId: string, prompts: Record<string, string>) => {
      setLoading(true)
      setError(null)
      try {
        await createSubcategory(name, categoryId, prompts)
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while creating subcategory")
        console.error("Error creating subcategory:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData],
  )

  const editCategory = useCallback(
    async (categoryId: string, name: string) => {
      setLoading(true)
      setError(null)
      try {
        await updateCategory(categoryId, name)
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while updating category")
        console.error("Error updating category:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData],
  )

  const editSubcategory = useCallback(
    async (subcategoryId: string, name: string, prompts: Record<string, string>) => {
      setLoading(true)
      setError(null)
      try {
        await updateSubcategory(subcategoryId, name, prompts)
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while updating subcategory")
        console.error("Error updating subcategory:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData],
  )

  const removeCategory = useCallback(
    async (categoryId: string) => {
      setLoading(true)
      setError(null)
      try {
        await deleteCategory(categoryId)
        if (selectedCategory?.category_id === categoryId) {
          setSelectedCategory(null)
        }
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while deleting category")
        console.error("Error deleting category:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData, selectedCategory],
  )

  const removeSubcategory = useCallback(
    async (subcategoryId: string) => {
      setLoading(true)
      setError(null)
      try {
        await deleteSubcategory(subcategoryId)
        if (selectedSubcategory?.id === subcategoryId) {
          setSelectedSubcategory(null)
        }
        await refreshData()
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while deleting subcategory")
        console.error("Error deleting subcategory:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refreshData, selectedSubcategory],
  )

  return (
    <PromptManagementContext.Provider
      value={{
        categories,
        subcategories,
        selectedCategory,
        selectedSubcategory,
        loading,
        error,
        refreshData,
        setSelectedCategory,
        setSelectedSubcategory,
        addCategory,
        addSubcategory,
        editCategory,
        editSubcategory,
        removeCategory,
        removeSubcategory,
      }}
    >
      {children}
    </PromptManagementContext.Provider>
  )
}

export function usePromptManagement() {
  const context = useContext(PromptManagementContext)
  if (context === undefined) {
    throw new Error("usePromptManagement must be used within a PromptManagementProvider")
  }
  return context
}

