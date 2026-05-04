"use client"

import React, { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Icons
import { 
  Globe, 
  Table as TableIcon, 
  FileText, 
  X, 
  Upload, 
  File as FileIcon,
  CheckCircle2, 
  Loader2,
} from "lucide-react"

// Helper for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ")
}

interface KnowledgeBasePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess?: () => void
}

interface ProgressItem {
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
}

export default function KnowledgeBasePicker({ 
  open, 
  onOpenChange, 
  projectId, 
  onSuccess 
}: KnowledgeBasePickerProps) {
  const [selectedType, setSelectedType] = useState<"webpage" | "file" | "table">("webpage")
  const [webpageUrl, setWebpageUrl] = useState("")
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [crawlSubpages, setCrawlSubpages] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadedTables, setUploadedTables] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<ProgressItem[]>([])

  // File upload dropzone
  const onFileDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps: getFileRootProps, getInputProps: getFileInputProps, isDragActive: isFileDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: {
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 12097152, // ~12MB
  })

  // Table upload dropzone
  const onTableDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedTables((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps: getTableRootProps, getInputProps: getTableInputProps, isDragActive: isTableDragActive } = useDropzone({
    onDrop: onTableDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".sql"],
      "application/sql": [".sql"],
    },
    maxSize: 5242880, // 5MB
  })

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeTable = (index: number) => {
    setUploadedTables((prev) => prev.filter((_, i) => i !== index))
  }

  // Unified API call for all knowledge source types
  const addKnowledgeSource = async (data: {
    type: "webpage" | "file" | "table"
    projectId: string
    url?: string
    crawlSubpages?: boolean
    autoUpdate?: boolean
    files?: File[]
  }) => {
    setUploading(true)
    
    try {
      let response;
      
      if (data.type === "webpage") {
        // JSON payload for webpage
        response = await fetch(`/api/projects/${projectId}/knowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: data.type,
            projectId: data.projectId,
            url: data.url,
            crawlSubpages: data.crawlSubpages,
            autoUpdate: data.autoUpdate,
          }),
        })
      } else {
        // FormData for file/table uploads
        const formData = new FormData()
        formData.append('type', data.type)
        formData.append('projectId', data.projectId)
        
        data.files?.forEach(file => {
          formData.append('files', file)
        })
        
        response = await fetch(`/api/projects/${projectId}/knowledge`, {
          method: 'POST',
          body: formData,
        })
      }
      
      if (response.ok) {
        const result = await response.json()
        if (result.progress) {
          setProgress(result.progress)
        }
        onSuccess?.()
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding knowledge source:', error)
      return false
    } finally {
      setUploading(false)
      setTimeout(() => setProgress([]), 2000)
    }
  }

  const handleSubmit = async () => {
    try {
      let success = false
      
      switch (selectedType) {
        case 'file':
          if (uploadedFiles.length > 0) {
            success = await addKnowledgeSource({
              type: 'file',
              projectId,
              files: uploadedFiles,
            })
            if (success) {
              setUploadedFiles([])
              onOpenChange(false)
            }
          }
          break
          
        case 'table':
          if (uploadedTables.length > 0) {
            success = await addKnowledgeSource({
              type: 'table',
              projectId,
              files: uploadedTables,
            })
            if (success) {
              setUploadedTables([])
              onOpenChange(false)
            }
          }
          break
          
        case 'webpage':
          if (webpageUrl) {
            success = await addKnowledgeSource({
              type: 'webpage',
              projectId,
              url: webpageUrl,
              crawlSubpages,
              autoUpdate,
            })
            if (success) {
              setWebpageUrl('')
              onOpenChange(false)
            }
          }
          break
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const canSubmit = () => {
    if (selectedType === 'file') return uploadedFiles.length > 0
    if (selectedType === 'table') return uploadedTables.length > 0
    if (selectedType === 'webpage') return webpageUrl.trim() !== ''
    return false
  }

  const resetForm = () => {
    setSelectedType("webpage")
    setWebpageUrl("")
    setAutoUpdate(false)
    setCrawlSubpages(false)
    setUploadedFiles([])
    setUploadedTables([])
    setProgress([])
    setUploading(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Knowledge Source</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Source Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "webpage" as const, icon: Globe, label: "Webpage" },
                { id: "file" as const, icon: FileText, label: "File" },
                { id: "table" as const, icon: TableIcon, label: "Table" },
              ].map((type) => (
                <div 
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 gap-2 rounded-md border cursor-pointer transition-all hover:bg-muted/50",
                    selectedType === type.id 
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                      : "border-border bg-background"
                  )}
                >
                  <type.icon className={cn("w-6 h-6", selectedType === type.id ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", selectedType === type.id ? "text-primary" : "text-foreground")}>
                    {type.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Webpage URL Input */}
          {selectedType === "webpage" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={webpageUrl}
                  onChange={(e) => setWebpageUrl(e.target.value)}
                />
                <p className="text-[0.8rem] text-muted-foreground">Publicly accessible URL to index.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3 p-3 rounded-md border">
                  <Checkbox
                    id="crawl-subpages"
                    checked={crawlSubpages}
                    onCheckedChange={(checked) => setCrawlSubpages(checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="crawl-subpages" className="font-medium cursor-pointer">
                      Crawl Subpages
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Index all links found on this page.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-md border">
                  <Checkbox
                    id="auto-update"
                    checked={autoUpdate}
                    onCheckedChange={(checked) => setAutoUpdate(checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="auto-update" className="font-medium cursor-pointer">
                      Auto-Sync
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Re-crawl periodically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File Upload UI */}
          {selectedType === "file" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div
                {...getFileRootProps()}
                className={cn(
                  "border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors",
                  isFileDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getFileInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT (Max 12MB)</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Ready to Upload</Label>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/10 text-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFile(index)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table Upload UI */}
          {selectedType === "table" && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div
                {...getTableRootProps()}
                className={cn(
                  "border border-dashed rounded-md p-8 text-center cursor-pointer transition-colors",
                  isTableDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getTableInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload structured data</p>
                <p className="text-xs text-muted-foreground mt-1">CSV, XLS, XLSX (Max 5MB)</p>
              </div>

              {uploadedTables.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Ready to Upload</Label>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {uploadedTables.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/10 text-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <TableIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeTable(index)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && progress.length > 0 && (
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Processing</Label>
              {progress.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {item.status === 'success' ? <CheckCircle2 className="w-3 h-3 text-green-500"/> : <Loader2 className="w-3 h-3 animate-spin"/>}
                      <span className="truncate max-w-[200px]">{item.fileName}</span>
                    </div>
                    <span>{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {uploading ? 'Processing...' : 'Add Source'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}