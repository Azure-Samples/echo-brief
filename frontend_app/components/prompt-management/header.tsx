import { Button } from "@/components/ui/button"
import { PlusCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { usePromptManagement } from "./prompt-management-context"
import { useState } from "react"
import { PromptDialog } from "./prompt-dialog"

export function PromptManagementHeader() {
  const { addCategory, fetchCategories, loading } = usePromptManagement()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)

  const handleAddCategory = async (name: string) => {

    setIsAddingCategory(true)
    
    // Add the category with optimistic UI update handling
    try {
      await addCategory(name)
    } finally {
      setIsAddingCategory(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchCategories()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Prompt Management</h2>
        <Breadcrumb className="flex items-center space-x-2 text-sm">
          <BreadcrumbItem className="inline-flex items-center">
            <BreadcrumbLink href="/" className="inline-flex items-center">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="mx-1 flex items-center">
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="inline-flex items-center">
            <BreadcrumbPage className="inline-flex items-center">Prompt Management</BreadcrumbPage>
          </BreadcrumbItem>
        </Breadcrumb>
        <p className="text-sm text-muted-foreground">
          Manage categories, subcategories, and prompts for your AI system.
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isRefreshing || loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
        
        <Button 
          onClick={() => setShowCategoryDialog(true)} 
          disabled={isAddingCategory || loading}
        >
          {isAddingCategory ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Category
            </>
          )}
        </Button>
      </div>

      {/* Custom dialog for adding a category */}
      <PromptDialog
        title="Add New Category"
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        onConfirm={handleAddCategory}
        placeholder="Enter category name"
        confirmLabel="Add Category"
      />
    </div>
  )
}