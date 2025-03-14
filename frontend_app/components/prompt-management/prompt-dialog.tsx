"use client"

import React, { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PromptDialogProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (value: string) => void
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

export function PromptDialog({
  title,
  open,
  onOpenChange,
  onConfirm,
  placeholder = "Enter a value",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel"
}: PromptDialogProps) {
  const [value, setValue] = useState("")

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value.trim())
      setValue("")
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setValue("")
    onOpenChange(false)
  }

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="prompt-value" className="sr-only">
            Value
          </Label>
          <Input
            id="prompt-value"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}