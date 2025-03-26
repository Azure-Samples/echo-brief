"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import dynamic from "next/dynamic"
import "@uiw/react-md-editor/markdown-editor.css"
import "@uiw/react-markdown-preview/markdown.css"

const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), { ssr: false })

const MDPreview = dynamic(() => import("@uiw/react-markdown-preview").then((mod) => mod.default), { ssr: false })

interface PromptKeyValue {
  key: string
  value: string
}

interface MarkdownEditorProps {
  initialPrompts?: Record<string, string>
  onSave: (prompts: Record<string, string>) => void
  onCancel?: () => void
  hideActionButtons?: boolean
}

export function MarkdownEditor({ initialPrompts = {}, onSave, onCancel, hideActionButtons = false }: MarkdownEditorProps) {
  const [prompts, setPrompts] = useState<PromptKeyValue[]>([])
  const [activeTab, setActiveTab] = useState("edit")
  const initializedRef = useRef(false)
  const saveRef = useRef(() => { })

  useEffect(() => {
    console.log("Initial setup of prompts from initialPrompts:", initialPrompts)
    const promptsArray = Object.entries(initialPrompts).map(([key, value]) => ({ key, value }))

    if (promptsArray.length === 0) {
      promptsArray.push({ key: "", value: "" })
    }

    console.log("Setting prompts to:", promptsArray)
    setPrompts(promptsArray)
  }, [initialPrompts])

  const handleAddPrompt = () => {
    console.log("Adding new prompt")
    setPrompts(prev => [...prev, { key: "", value: "" }])
  }

  const handleRemovePrompt = (index: number) => {
    console.log(`Removing prompt at index ${index}`)
    setPrompts(prev => {
      const newPrompts = [...prev]
      newPrompts.splice(index, 1)
      return newPrompts.length > 0 ? newPrompts : [{ key: "", value: "" }]
    })
  }

  const handleKeyChange = (index: number, key: string) => {
    console.log(`Updating prompt ${index} key to: ${key}`)
    setPrompts(prev => {
      const newPrompts = [...prev]
      newPrompts[index] = { ...newPrompts[index], key }

      // Auto-save using the latest state
      const promptsObject = Object.fromEntries(
        newPrompts.filter(p => p.key.trim()).map(p => [p.key.trim(), p.value.trim()])
      )
      onSave(promptsObject)

      return newPrompts
    })
  }

  const handleValueChange = (index: number, value: string) => {
    console.log(`Updating prompt ${index} value, length: ${value?.length || 0}`)
    setPrompts(prev => {
      const newPrompts = [...prev]
      newPrompts[index] = { ...newPrompts[index], value: value || "" }

      // Auto-save using the latest state
      const promptsObject = Object.fromEntries(
        newPrompts.filter(p => p.key.trim()).map(p => [p.key.trim(), p.value.trim()])
      )
      onSave(promptsObject)

      return newPrompts
    })
  }

  const handleSave = () => {
    const promptsObject: Record<string, string> = {}
    let hasValidPrompts = false

    prompts.forEach((prompt) => {
      if (prompt.key.trim()) {
        hasValidPrompts = true
        promptsObject[prompt.key.trim()] = prompt.value.trim()
      }
    })

    if (!hasValidPrompts) {
      console.warn("No valid prompts to save (all empty keys)")
    }

    console.log("Saving prompts:", promptsObject)
    onSave(promptsObject)
  }

  // Store the save handler in the ref
  useEffect(() => {
    saveRef.current = handleSave
  }, [prompts])

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit" className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={`prompt-${index}`} className="space-y-4 p-4 border rounded-md">
              <div key={`prompt-header-${index}`} className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Prompt {index + 1}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePrompt(index)}
                  disabled={prompts.length === 1}
                >
                  Remove
                </Button>
              </div>
              <div key={`prompt-key-field-${index}`} className="space-y-2">
                <Label htmlFor={`prompt-key-${index}`}>Prompt Key</Label>
                <Input
                  id={`prompt-key-${index}`}
                  value={prompt.key}
                  onChange={(e) => {
                    console.log("Key input changed:", e.target.value)
                    handleKeyChange(index, e.target.value)
                  }}
                  placeholder="Enter prompt key (e.g., 'greeting', 'introduction')"
                />
              </div>
              <div key={`prompt-content-${index}`} className="space-y-2">
                <Label htmlFor={`prompt-value-${index}`}>Prompt Content (Markdown)</Label>
                <MDEditor
                  value={prompt.value}
                  onChange={(value) => {
                    console.log("Editor content changed:", value?.substring(0, 20))
                    handleValueChange(index, value || "")
                  }}
                  preview="edit"
                  height={200}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddPrompt}
            className="w-full"
            disabled={prompts.some(prompt => !prompt.key.trim() || !prompt.value.trim())}
          >
            Add Prompt
          </Button>
        </TabsContent>
        <TabsContent value="preview" className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={`preview-prompt-${index}`} className="space-y-4 p-4 border rounded-md">
              <div key={`preview-header-${index}`} className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{prompt.key || `Prompt ${index + 1}`}</h3>
              </div>
              <div key={`preview-content-${index}`} className="p-4 border rounded-md bg-background">
                <MDPreview source={prompt.value} />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
      {!hideActionButtons && (
        <div key="action-buttons" className="flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={() => {
            console.log("Save button clicked, current prompts:", prompts)
            handleSave()
          }}>
            Save Prompts
          </Button>
        </div>
      )}
    </div>
  )
}

