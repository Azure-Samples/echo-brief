"use client"

import { useState, useEffect } from "react"
import { usePromptManagement } from "./prompt-management-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ChevronRight, ChevronDown, Folder, File, Plus, Trash2, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { PromptDialog } from "./prompt-dialog"
import { DeleteDialog } from "./delete-dialog"

export function PromptManagementContent() {
  const {
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
    addSubcategory,
    addPrompt,
    updatePrompt,
    deletePrompt,
    deleteCategory,
    deleteSubcategory
  } = usePromptManagement()

  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [newPromptTitle, setNewPromptTitle] = useState("")
  const [newPromptContent, setNewPromptContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editingContent, setEditingContent] = useState("")
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false)
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDialogProps, setDeleteDialogProps] = useState({
    title: "",
    description: "",
    onConfirm: () => {}
  })
  
  // Shadow state for optimistic updates
  const [optimisticCategories, setOptimisticCategories] = useState<any[]>([])
  const [hasOptimisticState, setHasOptimisticState] = useState(false)

  // Use useEffect to initialize optimistic categories
  useEffect(() => {
    if (categories.length > 0 && !hasOptimisticState) {
      setOptimisticCategories(categories)
    }
  }, [categories, hasOptimisticState])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleAddSubcategory = (categoryId: string) => {
    setPendingCategoryId(categoryId)
    setShowSubcategoryDialog(true)
  }

  const handleSubcategoryConfirm = async (name: string) => {
    if (!pendingCategoryId) return
    
    // Perform the actual subcategory addition
    await addSubcategory(pendingCategoryId, name)
    
    // Clear the pending category
    setPendingCategoryId(null)
  }

  const handleAddPrompt = async () => {
    if (!selectedCategory || !selectedSubcategory || !newPromptTitle || !newPromptContent) {
      return
    }
    
    setIsSaving(true)
    try {
      await addPrompt(selectedCategory, selectedSubcategory, {
        title: newPromptTitle,
        content: newPromptContent,
        category: selectedCategory,
        subcategory: selectedSubcategory
      })
      
      // Clear form after successful submission
      setNewPromptTitle("")
      setNewPromptContent("")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdatePrompt = async () => {
    if (!selectedPrompt || !editingContent) return
    
    setIsSaving(true)
    try {
      await updatePrompt(selectedPrompt.id, editingContent)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditPrompt = (prompt: any) => {
    setSelectedPrompt(prompt)
    setEditingContent(prompt.content)
  }

  const showDeletePromptDialog = (promptId: string) => {
    const promptToDelete = findPromptById(promptId)
    if (!promptToDelete) return
    
    setDeleteDialogProps({
      title: "Delete Prompt",
      description: `Are you sure you want to delete "${promptToDelete.title}"? This action cannot be undone.`,
      onConfirm: () => confirmDeletePrompt(promptId)
    })
    setDeleteDialogOpen(true)
  }

  const confirmDeletePrompt = (promptId: string) => {
    // If this is the selected prompt, deselect it
    if (selectedPrompt?.id === promptId) {
      setSelectedPrompt(null)
    }
    
    // Find the prompt in our optimistic categories to update UI immediately
    const { categoryId, subcategoryId } = findPromptLocation(promptId)
    
    if (categoryId && subcategoryId) {
      // Update optimistic state for immediate UI feedback
      setHasOptimisticState(true)
      setOptimisticCategories(prev => {
        return prev.map(category => {
          if (category.id === categoryId) {
            return {
              ...category,
              subcategories: category.subcategories.map(subcategory => {
                if (subcategory.id === subcategoryId) {
                  return {
                    ...subcategory,
                    prompts: subcategory.prompts.filter(p => p.id !== promptId)
                  }
                }
                return subcategory
              })
            }
          }
          return category
        })
      })
      
      // Now perform the actual delete
      setIsSaving(true)
      deletePrompt(promptId)
        .then(() => {
          setHasOptimisticState(false) // Clear optimistic flag when operation completes
        })
        .catch(() => {
          // On error, revert to server state
          setOptimisticCategories(categories)
          setHasOptimisticState(false)
        })
        .finally(() => {
          setIsSaving(false)
        })
    }
  }

  const showDeleteCategoryDialog = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const categoryToDelete = findCategoryById(categoryId)
    if (!categoryToDelete) return
    
    setDeleteDialogProps({
      title: "Delete Category",
      description: `Are you sure you want to delete "${categoryToDelete.name}" and all its subcategories and prompts? This action cannot be undone.`,
      onConfirm: () => confirmDeleteCategory(categoryId)
    })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteCategory = (categoryId: string) => {
    // If this is the selected category, deselect it and its children
    if (selectedCategory === categoryId) {
      setSelectedCategory(null)
      setSelectedSubcategory(null)
      setSelectedPrompt(null)
    }
    
    // Update optimistic state for immediate UI feedback
    setHasOptimisticState(true)
    setOptimisticCategories(prev => prev.filter(c => c.id !== categoryId))
    
    // Now perform the actual delete
    setIsSaving(true)
    deleteCategory(categoryId)
      .then(() => {
        setHasOptimisticState(false) // Clear optimistic flag when operation completes
      })
      .catch(() => {
        // On error, revert to server state
        setOptimisticCategories(categories)
        setHasOptimisticState(false)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const showDeleteSubcategoryDialog = (categoryId: string, subcategoryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const category = findCategoryById(categoryId)
    const subcategory = category?.subcategories.find(s => s.id === subcategoryId)
    if (!category || !subcategory) return
    
    setDeleteDialogProps({
      title: "Delete Subcategory",
      description: `Are you sure you want to delete "${subcategory.name}" and all its prompts? This action cannot be undone.`,
      onConfirm: () => confirmDeleteSubcategory(categoryId, subcategoryId)
    })
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSubcategory = (categoryId: string, subcategoryId: string) => {
    // If this is the selected subcategory, deselect it and its children
    if (selectedSubcategory === subcategoryId) {
      setSelectedSubcategory(null)
      setSelectedPrompt(null)
    }
    
    // Update optimistic state for immediate UI feedback
    setHasOptimisticState(true)
    setOptimisticCategories(prev => {
      return prev.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            subcategories: category.subcategories.filter(s => s.id !== subcategoryId)
          }
        }
        return category
      })
    })
    
    // Now perform the actual delete
    setIsSaving(true)
    deleteSubcategory(categoryId, subcategoryId)
      .then(() => {
        setHasOptimisticState(false) // Clear optimistic flag when operation completes
      })
      .catch(() => {
        // On error, revert to server state
        setOptimisticCategories(categories)
        setHasOptimisticState(false)
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  // Helper functions for finding items in the data structure
  const findCategoryById = (categoryId: string) => {
    return (hasOptimisticState ? optimisticCategories : categories).find(c => c.id === categoryId)
  }
  
  const findPromptById = (promptId: string) => {
    const cats = hasOptimisticState ? optimisticCategories : categories
    for (const category of cats) {
      for (const subcategory of category.subcategories) {
        const prompt = subcategory.prompts.find(p => p.id === promptId)
        if (prompt) return prompt
      }
    }
    return null
  }
  
  const findPromptLocation = (promptId: string) => {
    const cats = hasOptimisticState ? optimisticCategories : categories
    for (const category of cats) {
      for (const subcategory of category.subcategories) {
        const prompt = subcategory.prompts.find(p => p.id === promptId)
        if (prompt) {
          return { categoryId: category.id, subcategoryId: subcategory.id }
        }
      }
    }
    return { categoryId: null, subcategoryId: null }
  }

  // Find the selected category and subcategory objects
  const selectedCategoryObj = findCategoryById(selectedCategory!)
  const selectedSubcategoryObj = selectedCategoryObj?.subcategories.find(s => s.id === selectedSubcategory)

  // Use optimistic categories for rendering if we have them
  const displayCategories = hasOptimisticState ? optimisticCategories : categories

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12 md:col-span-3">
        <CardContent className="p-4">
          {loading && !isSaving && <Progress className="mb-4" />}
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            {displayCategories.length === 0 && !loading && (
              <div className="p-4 text-center text-muted-foreground">
                No categories found. Create a new category to get started.
              </div>
            )}
            
            {displayCategories.map(category => (
              <div key={category.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2"
                    onClick={() => toggleCategory(category.id)}
                  >
                    {expandedCategories.includes(category.id) ? 
                      <ChevronDown className="mr-2 h-4 w-4" /> : 
                      <ChevronRight className="mr-2 h-4 w-4" />}
                    <Folder className="mr-2 h-4 w-4" />
                    {category.name}
                  </Button>
                  <div className="flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => showDeleteCategoryDialog(category.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {expandedCategories.includes(category.id) && (
                  <div className="ml-6 mt-2">
                    {category.subcategories.map(subcategory => (
                      <div key={subcategory.id} className="flex items-center justify-between">
                        <Button
                          variant={selectedSubcategory === subcategory.id ? "secondary" : "ghost"}
                          className="w-full justify-start p-2"
                          onClick={() => {
                            setSelectedCategory(category.id)
                            setSelectedSubcategory(subcategory.id)
                            setSelectedPrompt(null)
                          }}
                        >
                          <File className="mr-2 h-4 w-4" />
                          {subcategory.name}
                        </Button>
                        <div className="flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => showDeleteSubcategoryDialog(category.id, subcategory.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-2"
                      onClick={() => handleAddSubcategory(category.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subcategory
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="col-span-12 md:col-span-9">
        <CardContent className="p-6">
          {(loading && isSaving) && <Progress className="mb-4" />}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {selectedCategory && selectedSubcategory ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold">
                  {selectedCategoryObj?.name} / {selectedSubcategoryObj?.name}
                </h3>
              </div>
              
              <h4 className="text-lg font-semibold mb-2">Prompts</h4>
              <div className="grid gap-4 mb-4">
                {selectedSubcategoryObj?.prompts.length === 0 ? (
                  <div className="text-muted-foreground">
                    No prompts yet. Add a new prompt below.
                  </div>
                ) : (
                  selectedSubcategoryObj?.prompts.map(prompt => (
                    <Button
                      key={prompt.id}
                      variant={selectedPrompt?.id === prompt.id ? "secondary" : "outline"}
                      className="justify-start p-4 h-auto"
                      onClick={() => handleEditPrompt(prompt)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{prompt.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-full">
                          {prompt.content.substring(0, 100)}...
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
              
              {!selectedPrompt ? (
                <>
                  <Separator className="my-4" />
                  <h4 className="text-lg font-semibold mb-2">Add New Prompt</h4>
                  <div className="space-y-4">
                    <Input
                      placeholder="Prompt Title"
                      value={newPromptTitle}
                      onChange={(e) => setNewPromptTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Enter prompt content here..."
                      value={newPromptContent}
                      onChange={(e) => setNewPromptContent(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <Button 
                      onClick={handleAddPrompt} 
                      disabled={isSaving || !newPromptTitle || !newPromptContent}
                    >
                      {isSaving ? "Adding..." : "Add Prompt"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-2xl font-semibold">{selectedPrompt.title}</h3>
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="min-h-[300px]"
                  />
                  <div className="flex space-x-4">
                    <Button onClick={handleUpdatePrompt} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => showDeletePromptDialog(selectedPrompt.id)}
                      disabled={isSaving}
                    >
                      Delete Prompt
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <AlertTitle>No Selection</AlertTitle>
              <AlertDescription>
                Please select a category and subcategory from the sidebar to manage prompts.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog for adding subcategories */}
      <PromptDialog
        title="Add New Subcategory"
        open={showSubcategoryDialog}
        onOpenChange={setShowSubcategoryDialog}
        onConfirm={handleSubcategoryConfirm}
        placeholder="Enter subcategory name"
        confirmLabel="Add Subcategory"
      />
      
      {/* Dialog for delete confirmations */}
      <DeleteDialog 
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={deleteDialogProps.onConfirm}
        title={deleteDialogProps.title}
        description={deleteDialogProps.description}
      />
    </div>
  )
}