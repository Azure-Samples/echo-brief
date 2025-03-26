"use client"

import { useState } from "react"
import { usePromptManagement, type Category, type Subcategory } from "./prompt-management-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ChevronRight, ChevronDown, Folder, File, Plus, Trash2, Edit, Loader2, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MarkdownEditor } from "./markdown-editor"
import { SubcategoryForm } from "./subcategory-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import dynamic from "next/dynamic"

const MDPreview = dynamic(() => import("@uiw/react-markdown-preview").then((mod) => mod.default), { ssr: false })

export function PromptManagementContent() {
  const {
    categories,
    subcategories,
    selectedCategory,
    selectedSubcategory,
    loading,
    error,
    setSelectedCategory,
    setSelectedSubcategory,
    addSubcategory,
    editCategory,
    editSubcategory,
    removeCategory,
    removeSubcategory,
    refreshData,
  } = usePromptManagement()

  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [isEditSubcategoryOpen, setIsEditSubcategoryOpen] = useState(false)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [editSubcategoryName, setEditSubcategoryName] = useState("")
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false)
  const [isDeleteSubcategoryOpen, setIsDeleteSubcategoryOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<Subcategory | null>(null)

  const toggleCategory = (categoryId: string) => {
    console.log("Toggling category with ID:", categoryId);

    setExpandedCategories((prev) => {
      if (prev.includes(categoryId)) {
        console.log("Removing category from expanded list");
        return prev.filter((id) => id !== categoryId);
      } else {
        console.log("Adding category to expanded list");
        return [...prev, categoryId];
      }
    });
  }

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category)
    setSelectedSubcategory(null)
    // Get the actual category ID with fallback
    const categoryId = category.category_id || category.id || "";
    if (!expandedCategories.includes(categoryId)) {
      toggleCategory(categoryId)
    }
  }

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory)
  }

  const handleAddSubcategory = async (name: string, categoryId: string, prompts: Record<string, string>) => {
    console.log("Adding subcategory with name:", name);
    console.log("Category ID for new subcategory:", categoryId);
    console.log("Prompts:", prompts);

    if (!categoryId) {
      console.error("Category ID is undefined");
      toast({
        title: "Error",
        description: "Cannot add subcategory: missing category ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await addSubcategory(name, categoryId, prompts);
      // Refresh the data after adding the subcategory
      await refreshData();
      toast({
        title: "Success",
        description: "Subcategory added successfully",
      });
      setIsAddSubcategoryOpen(false);
    } catch (error) {
      console.error("Error adding subcategory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create subcategory",
        variant: "destructive",
      });
    }
  }

  const handleEditCategory = async () => {
    console.log("handleEditCategory called, isEditCategoryOpen:", isEditCategoryOpen);
    console.log("Current selectedCategory:", selectedCategory);
    console.log("Current editCategoryName:", editCategoryName);

    if (!selectedCategory) {
      console.error("No category selected for editing");
      toast({
        title: "Error",
        description: "No category selected for editing",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use either category_id or id, whichever is available
      const categoryId = selectedCategory.category_id || selectedCategory.id;
      console.log("Editing category with ID:", categoryId);
      console.log("New name:", editCategoryName);

      if (!categoryId) {
        throw new Error("Category ID is undefined");
      }

      // Debug the API call params
      console.log("About to call editCategory with:", {
        categoryId,
        name: editCategoryName
      });

      await editCategory(categoryId, editCategoryName);
      console.log("Category updated successfully");

      // Update the selected category with the new name
      setSelectedCategory({
        ...selectedCategory,
        name: editCategoryName
      });

      toast({
        title: "Success",
        description: "Category updated successfully",
      });

      setIsEditCategoryOpen(false);
      console.log("Edit dialog closed after successful update");
    } catch (error) {
      console.error("Edit category error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update category",
        variant: "destructive",
      });
    }
  }

  const handleEditSubcategory = async () => {
    if (!selectedSubcategory) {
      console.error("No subcategory selected for editing");
      toast({
        title: "Error",
        description: "No subcategory selected for editing",
        variant: "destructive",
      });
      return;
    }

    try {
      const subcategoryId = selectedSubcategory.id;
      if (!subcategoryId) {
        throw new Error("Invalid subcategory ID");
      }

      console.log("Updating subcategory:", {
        id: subcategoryId,
        name: editSubcategoryName,
        prompts: editPrompts
      });

      await editSubcategory(subcategoryId, editSubcategoryName, editPrompts);
      // Refresh the data after updating the subcategory
      await refreshData();

      toast({
        title: "Success",
        description: "Subcategory updated successfully",
      });
      setIsEditSubcategoryOpen(false);
    } catch (error) {
      console.error("Error updating subcategory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update subcategory",
        variant: "destructive",
      });
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const categoryId = categoryToDelete.category_id || categoryToDelete.id || "";
      await removeCategory(categoryId);
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      setIsDeleteCategoryOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    }
  }

  const handleDeleteSubcategory = async () => {
    if (!subcategoryToDelete || !subcategoryToDelete.id) {
      console.error("Invalid subcategory or missing subcategory ID:", subcategoryToDelete);
      toast({
        title: "Error",
        description: "Cannot delete subcategory: Invalid subcategory data",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Attempting to delete subcategory:", subcategoryToDelete);
      await removeSubcategory(subcategoryToDelete.id);
      // Refresh the data after deleting the subcategory
      await refreshData();

      // Clear selected subcategory if it was the one that was deleted
      if (selectedSubcategory?.id === subcategoryToDelete.id) {
        setSelectedSubcategory(null);
      }

      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
      setIsDeleteSubcategoryOpen(false);
      setSubcategoryToDelete(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete subcategory";
      console.error("Error deleting subcategory:", error);

      // Show more specific error messages
      if (errorMessage.includes("404")) {
        toast({
          title: "Error",
          description: "Subcategory not found. It may have been already deleted.",
          variant: "destructive",
        });
        // Close the dialog and clear the selection since the subcategory doesn't exist
        setIsDeleteSubcategoryOpen(false);
        setSubcategoryToDelete(null);
        if (selectedSubcategory?.id === subcategoryToDelete.id) {
          setSelectedSubcategory(null);
        }
      } else if (errorMessage.includes("401")) {
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }

  const openEditCategory = (category: Category) => {
    console.log("openEditCategory called with:", category);

    // Check for either category_id or id property
    const categoryId = category?.category_id || category?.id;

    if (!category || !categoryId) {
      console.error("Invalid category data:", category);
      toast({
        title: "Error",
        description: "Could not edit category: missing or invalid data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a normalized category object
      const normalizedCategory = {
        ...category,
        category_id: categoryId,
      };

      // First set the data
      setSelectedCategory(normalizedCategory);
      setEditCategoryName(category.name);

      console.log("Category ID before opening dialog:", categoryId);
      console.log("Category name before opening dialog:", category.name);

      // Then open the dialog with a small delay to ensure state is updated
      setTimeout(() => {
        console.log("Opening edit dialog now");
        setIsEditCategoryOpen(true);
      }, 10);
    } catch (error) {
      console.error("Error in openEditCategory:", error);
      toast({
        title: "Error",
        description: "Something went wrong while trying to edit the category",
        variant: "destructive",
      });
    }
  }

  const openEditSubcategory = (subcategory: Subcategory) => {
    console.log("Opening edit dialog for subcategory:", subcategory);

    if (!subcategory || !subcategory.id) {
      console.error("Invalid subcategory data:", subcategory);
      toast({
        title: "Error",
        description: "Cannot edit subcategory: Invalid data",
        variant: "destructive",
      });
      return;
    }

    // Set the selected subcategory first
    setSelectedSubcategory(subcategory);

    // Then set the form data
    setEditSubcategoryName(subcategory.name);
    setEditPrompts(subcategory.prompts);

    // Finally open the dialog
    setIsEditSubcategoryOpen(true);
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-3">
        <CardContent className="p-4">
          {loading && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {categories.map((category) => (
              <div key={category.category_id || category.id || ""} className="mb-2">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {expandedCategories.includes(category.category_id || category.id || "") ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    <Folder className="mr-2 h-4 w-4" />
                    {category.name}
                  </Button>
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCategory(category);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryToDelete(category);
                        setIsDeleteCategoryOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {expandedCategories.includes(category.category_id || category.id || "") && (
                  <div className="ml-6 mt-2">
                    {subcategories
                      .filter((sub) => sub.category_id === (category.category_id || category.id || ""))
                      .map((subcategory) => (
                        <div key={subcategory.id} className="flex items-center justify-between">
                          <Button
                            variant={
                              selectedSubcategory?.id === subcategory.id ? "secondary" : "ghost"
                            }
                            className="w-full justify-start p-2"
                            onClick={() => handleSubcategoryClick(subcategory)}
                          >
                            <File className="mr-2 h-4 w-4" />
                            {subcategory.name}
                          </Button>
                          <div className="flex">
                            <Button variant="ghost" size="icon" onClick={() => openEditSubcategory(subcategory)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubcategoryToDelete(subcategory);
                                setIsDeleteSubcategoryOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-2"
                      onClick={() => {
                        const normalizedCategory = {
                          ...category,
                          category_id: category.category_id || category.id || "",
                        };
                        setSelectedCategory(normalizedCategory);
                        setIsAddSubcategoryOpen(true);
                      }}
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

      <Card className="col-span-9">
        <CardContent className="p-6">
          {selectedSubcategory ? (
            <div className="space-y-6">
              <div key="subcategory-header" className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{selectedSubcategory.name}</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => openEditSubcategory(selectedSubcategory)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Subcategory
                  </Button>
                </div>
              </div>

              <Separator key="subcategory-separator" />

              <div key="prompts-section" className="space-y-4">
                <h3 className="text-xl font-semibold">Prompts</h3>
                {Object.entries(selectedSubcategory.prompts).map(([key, value]) => (
                  <Card key={key} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-muted p-3 font-medium border-b">{key}</div>
                      <div className="p-4">
                        <MDPreview source={value} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : selectedCategory ? (
            <div className="space-y-6">
              <div key="category-header" className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{selectedCategory.name}</h2>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      // Make sure the event doesn't propagate up to parent elements
                      e.stopPropagation();
                      console.log("Edit button clicked", selectedCategory);
                      if (selectedCategory) {
                        openEditCategory(selectedCategory);
                      } else {
                        console.error("No category selected for editing");
                      }
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Category
                  </Button>
                  <Button onClick={() => {
                    if (selectedCategory) {
                      const normalizedCategory = {
                        ...selectedCategory,
                        category_id: selectedCategory.category_id || selectedCategory.id || "",
                      };
                      setSelectedCategory(normalizedCategory);
                    }
                    setIsAddSubcategoryOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subcategory
                  </Button>
                </div>
              </div>

              <Separator key="category-separator" />

              <div key="subcategories-section" className="space-y-4">
                <h3 className="text-xl font-semibold">Subcategories</h3>
                {subcategories
                  .filter((sub) => sub.category_id === (selectedCategory.category_id || selectedCategory.id || ""))
                  .map((subcategory) => (
                    <Button
                      key={subcategory.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleSubcategoryClick(subcategory)}
                    >
                      <div>
                        <div className="font-medium">{subcategory.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {Object.keys(subcategory.prompts).length} prompts
                        </div>
                      </div>
                    </Button>
                  ))}

                {subcategories.filter((sub) => sub.category_id === (selectedCategory.category_id || selectedCategory.id || "")).length === 0 && (
                  <Alert key="no-subcategories-alert">
                    <AlertTitle>No subcategories</AlertTitle>
                    <AlertDescription>
                      This category doesn't have any subcategories yet. Click the "Add Subcategory" button to create
                      one.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTitle>No Selection</AlertTitle>
              <AlertDescription>
                Please select a category or subcategory from the sidebar to view details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Add Subcategory Dialog */}
      <Dialog
        open={isAddSubcategoryOpen}
        onOpenChange={(open) => {
          console.log("Add subcategory dialog change:", open);
          if (!open) {
            // Only close the dialog here, don't open it
            setIsAddSubcategoryOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Subcategory</DialogTitle>
          </DialogHeader>
          {isAddSubcategoryOpen && (
            <SubcategoryForm
              key={`subcategory-form-${selectedCategory?.category_id || selectedCategory?.id || ""}`}
              categories={categories}
              selectedCategoryId={selectedCategory?.category_id || selectedCategory?.id || ""}
              onSubmit={handleAddSubcategory}
              onCancel={() => setIsAddSubcategoryOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog
        open={isEditCategoryOpen}
        onOpenChange={(open) => {
          console.log("Edit category dialog state changing to:", open, "current state:", isEditCategoryOpen);
          console.log("Selected category at dialog state change:", selectedCategory);

          // If the dialog is being closed
          if (!open) {
            setIsEditCategoryOpen(false);
            console.log("Dialog closed by onOpenChange");
          } else {
            // If the dialog is being opened, verify we have the category with a valid ID
            if (selectedCategory && (selectedCategory.category_id || selectedCategory.id)) {
              setIsEditCategoryOpen(true);
              console.log("Dialog opened by onOpenChange with category ID:", selectedCategory.category_id || selectedCategory.id);
            } else {
              console.error("Trying to open category dialog but no valid category is selected:", selectedCategory);
              // Don't open the dialog if no category is selected
              return false;
            }
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div key="category-name-field" className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
              />
            </div>
            {selectedCategory && (
              <div key="category-id-display" className="text-xs text-muted-foreground">
                Category ID: {selectedCategory.category_id || selectedCategory.id}
              </div>
            )}
            <div key="action-buttons" className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditCategory} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Dialog */}
      <Dialog open={isEditSubcategoryOpen} onOpenChange={setIsEditSubcategoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div key="subcategory-name-field" className="space-y-2">
              <Label htmlFor="edit-subcategory-name">Subcategory Name</Label>
              <Input
                id="edit-subcategory-name"
                value={editSubcategoryName}
                onChange={(e) => setEditSubcategoryName(e.target.value)}
              />
            </div>
            <div key="prompts-editor" className="space-y-2">
              <Label>Prompts</Label>
              <MarkdownEditor
                initialPrompts={editPrompts}
                onSave={setEditPrompts}
                onCancel={() => setIsEditSubcategoryOpen(false)}
                hideActionButtons={true}
              />
            </div>
            <div key="action-buttons" className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditSubcategoryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  handleEditSubcategory();
                }}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? This will also delete all
              subcategories and their prompts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteCategoryOpen(false)
                setCategoryToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={loading}>
              {loading ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory Confirmation Dialog */}
      <Dialog open={isDeleteSubcategoryOpen} onOpenChange={setIsDeleteSubcategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Subcategory
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the subcategory "{subcategoryToDelete?.name}"? This will also delete all
              prompts associated with this subcategory. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteSubcategoryOpen(false)
                setSubcategoryToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubcategory} disabled={loading}>
              {loading ? "Deleting..." : "Delete Subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

