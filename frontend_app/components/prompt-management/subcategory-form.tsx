"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { MarkdownEditor } from "./markdown-editor"
import type { Category } from "./prompt-management-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SubcategoryFormProps {
    categories: Category[]
    selectedCategoryId?: string
    onSubmit: (name: string, categoryId: string, prompts: Record<string, string>) => Promise<void>
    onCancel: () => void
}

export function SubcategoryForm({ categories, selectedCategoryId, onSubmit, onCancel }: SubcategoryFormProps) {
    const [name, setName] = useState("")
    const [categoryId, setCategoryId] = useState(selectedCategoryId || "")
    const [prompts, setPrompts] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()
    const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({})

    useEffect(() => {
        if (selectedCategoryId) {
            console.log("SubcategoryForm received selectedCategoryId:", selectedCategoryId)
            setCategoryId(selectedCategoryId)
        }
    }, [selectedCategoryId])

    const handlePromptsUpdate = (updatedPrompts: Record<string, string>) => {
        console.log("Received prompts update:", updatedPrompts)
        setSavedPrompts(updatedPrompts)
        setPrompts(updatedPrompts)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        console.log("Submitting subcategory with name:", name)
        console.log("Using category ID:", categoryId)
        console.log("Final prompts to submit:", savedPrompts)

        if (!name.trim()) {
            toast({
                title: "Error",
                description: "Subcategory name cannot be empty",
                variant: "destructive",
            })
            return
        }

        if (!categoryId) {
            toast({
                title: "Error",
                description: "Please select a category",
                variant: "destructive",
            })
            return
        }

        // Ensure we have at least one prompt with a key
        const validPrompts = Object.entries(savedPrompts).filter(([key]) => key.trim())
        if (validPrompts.length === 0) {
            toast({
                title: "Error",
                description: "Please add at least one prompt with a key",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            // Convert the prompts to the correct format
            const formattedPrompts = Object.fromEntries(
                validPrompts.map(([key, value]) => [key.trim(), value.trim()])
            )

            console.log("Submitting with formatted prompts:", formattedPrompts)
            await onSubmit(name, categoryId, formattedPrompts)

            // Reset form after successful submission
            setName("")
            setSavedPrompts({})
            setPrompts({})
        } catch (error) {
            console.error("Error submitting subcategory:", error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to create subcategory",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div key="subcategory-name" className="space-y-2">
                <Label htmlFor="name">Subcategory Name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter subcategory name"
                    required
                />
            </div>

            <div key="category-select" className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={!!selectedCategoryId}
                    required
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((category) => (
                            <SelectItem
                                key={category.category_id || category.id || ""}
                                value={category.category_id || category.id || ""}
                            >
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div key="prompts-editor" className="space-y-2">
                <Label>Prompts</Label>
                <MarkdownEditor
                    initialPrompts={prompts}
                    onSave={handlePromptsUpdate}
                    hideActionButtons={true}
                />
            </div>

            <div key="action-buttons" className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || Object.keys(savedPrompts).length === 0}
                >
                    {isSubmitting ? "Creating..." : "Create Subcategory"}
                </Button>
            </div>
        </form>
    )
}

