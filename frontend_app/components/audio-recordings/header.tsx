import { Button } from "@/components/ui/button"
import { Upload, ChevronRight } from 'lucide-react'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import Link from "next/link"

export function AudioRecordingsHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Audio Recordings</h2>
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
          Manage and monitor all uploaded audio files and their processing status.
        </p>
      </div>
      <Link href="/audio-upload">
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Add New Audio Recording
        </Button>
      </Link>
    </div>
  )
}

