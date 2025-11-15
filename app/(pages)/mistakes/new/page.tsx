'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Upload, X, FileText, Loader2, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface FormData {
  mistakeIdentified: string
  impact: string
  rootCause: string
  resolution: string
  learnings: string
  category: string
  mistakeDate: string
  authorId: string
}

interface FileWithPreview extends File {
  preview?: string
}

export default function NewMistakePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id ?? ''
  
  const [formData, setFormData] = useState<FormData>({
    mistakeIdentified: '',
    impact: '',
    rootCause: '',
    resolution: '',
    learnings: '',
    category: '',
    mistakeDate: new Date().toISOString().split('T')[0],
    authorId: ''
  })

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!userId) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      authorId: userId,
    }))
  }, [status, userId])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    const filesWithPreview = selectedFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      return fileWithPreview
    })
    
    setFiles(prev => [...prev, ...filesWithPreview])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateForm = () => {
    if (!formData.mistakeIdentified.trim()) {
      setError('Mistake identification is required')
      return false
    }
    if (!formData.impact) {
      setError('Impact level is required')
      return false
    }
    if (!formData.category) {
      setError('Category is required')
      return false
    }
    if (!formData.rootCause.trim()) {
      setError('Root cause is required')
      return false
    }
    if (!formData.resolution.trim()) {
      setError('Resolution is required')
      return false
    }
    if (!formData.learnings.trim()) {
      setError('Learnings are required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const formDataToSend = new FormData()
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value)
      })
      
      // Add files
      files.forEach(file => {
        formDataToSend.append('attachments', file)
      })

      const response = await fetch('/api/mistakes', {
        method: 'POST',
        body: formDataToSend,
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Mistake logged successfully!')
        setTimeout(() => {
          router.push('/mistakes')
        }, 1500)
      } else {
        setError(result.error || 'Failed to create mistake log')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className=" py-8">
      <div className=" px-4 ">
        {/* Header */}
        <div className="mb-6">
          <Link href="/mistakes">
            <Button variant="ghost" className="mb-4 hover:/60">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mistakes
            </Button>
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-6 mt-10 lg -red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 mt-10 lg -green-200 50">
            <AlertCircle className="h-4 w-4 600" />
            <AlertDescription className="700 font-medium">{success}</AlertDescription>
          </Alert>
        )}
  <Card className="mt-8  lg -0 r from-amber-50 to-orange-50 backdrop-blur-sm">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Tips for Better Mistake Documentation
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-700">
              <div className="space-y-2">
                <p><strong>Be Specific:</strong> Include exact times, steps, and conditions</p>
                <p><strong>No Blame:</strong> Focus on the process, not individuals</p>
              </div>
              <div className="space-y-2">
                <p><strong>Think Prevention:</strong> How can we stop this from recurring?</p>
                <p><strong>Add Context:</strong> Screenshots and documents help others learn</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Main Form Card */}
        <Card className="mt-10 2xl -0 /90 backdrop-blur-lg overflow-hidden">
          <CardHeader className="r from-blue-600 via-purple-600 to-indigo-600 ">
            <CardTitle className="text-2xl font-bold flex items-center">
              <div className="w-8 h-8 /20 rounded-full flex items-center justify-center mr-3">
                📝
              </div>
              Mistake Details
            </CardTitle>
            <CardDescription className="100 text-base">
              Fill in all the required information about the mistake to help improve our processes
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Mistake Identification */}
              <div className="space-y-3">
                <Label htmlFor="mistakeIdentified" className="text-lg font-semibold ">
                  Mistake Identified *
                </Label>
                <Input
                  id="mistakeIdentified"
                  value={formData.mistakeIdentified}
                  onChange={(e) => handleInputChange('mistakeIdentified', e.target.value)}
                  placeholder="Provide a clear, brief description of the mistake..."
                  className="text-base h-12 -2 -slate-200 focus:-blue-500 transition-all duration-200"
                  maxLength={500}
                />
                <p className="text-sm  flex justify-between">
                  <span>Be specific and concise</span>
                  <span className="font-medium">{formData.mistakeIdentified.length}/500</span>
                </p>
              </div>

              {/* Impact and Category Row */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="impact" className="text-lg font-semibold ">
                    Impact Level *
                  </Label>
                  <Select value={formData.impact} onValueChange={(value) => handleInputChange('impact', value)}>
                    <SelectTrigger className="h-12 text-base -2 -slate-200 focus:-blue-500">
                      <SelectValue placeholder="Select the impact level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW" className="text-base">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          Low Impact
                        </div>
                      </SelectItem>
                      <SelectItem value="MEDIUM" className="text-base">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          Medium Impact
                        </div>
                      </SelectItem>
                      <SelectItem value="HIGH" className="text-base">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          High Impact
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-lg font-semibold ">
                    Category *
                  </Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="h-12 text-base -2 -slate-200 focus:-blue-500">
                      <SelectValue placeholder="Select mistake category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROCESS" className="text-base">
                        <div className="flex items-center">
                          <span className="mr-2">🔄</span>
                          Process Related
                        </div>
                      </SelectItem>
                      <SelectItem value="TECHNICAL" className="text-base">
                        <div className="flex items-center">
                          <span className="mr-2">⚙️</span>
                          Technical Issue
                        </div>
                      </SelectItem>
                      <SelectItem value="HUMAN_ERROR" className="text-base">
                        <div className="flex items-center">
                          <span className="mr-2">👤</span>
                          Human Error
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mistake Date */}
              <div className="space-y-3">
                <Label htmlFor="mistakeDate" className="text-lg font-semibold ">
                  When did this mistake occur? *
                </Label>
                <Input
                  id="mistakeDate"
                  type="date"
                  value={formData.mistakeDate}
                  onChange={(e) => handleInputChange('mistakeDate', e.target.value)}
                  className="text-base h-12 -2 -slate-200 focus:-blue-500 transition-all duration-200"
                />
              </div>

              {/* Root Cause Analysis */}
              <div className="space-y-3">
                <Label htmlFor="rootCause" className="text-lg font-semibold ">
                  Root Cause Analysis *
                </Label>
                <Textarea
                  id="rootCause"
                  value={formData.rootCause}
                  onChange={(e) => handleInputChange('rootCause', e.target.value)}
                  placeholder="Dive deep into what really caused this mistake. Consider the 5 Whys approach..."
                  className="min-h-[140px] text-base -2 -slate-200 focus:-blue-500 transition-all duration-200 resize-y"
                  rows={6}
                />
                <p className="text-sm ">Think about underlying causes, not just symptoms</p>
              </div>

              {/* Resolution */}
              <div className="space-y-3">
                <Label htmlFor="resolution" className="text-lg font-semibold ">
                  How was it resolved? *
                </Label>
                <Textarea
                  id="resolution"
                  value={formData.resolution}
                  onChange={(e) => handleInputChange('resolution', e.target.value)}
                  placeholder="Describe the steps taken to fix the mistake and restore normal operations..."
                  className="min-h-[140px] text-base -2 -slate-200 focus:-blue-500 transition-all duration-200 resize-y"
                  rows={6}
                />
                <p className="text-sm ">Include immediate fixes and long-term solutions</p>
              </div>

              {/* Key Learnings */}
              <div className="space-y-3">
                <Label htmlFor="learnings" className="text-lg font-semibold ">
                  Key Learnings & Prevention *
                </Label>
                <Textarea
                  id="learnings"
                  value={formData.learnings}
                  onChange={(e) => handleInputChange('learnings', e.target.value)}
                  placeholder="What did you learn? How will you prevent this from happening again? What processes need to change?"
                  className="min-h-[140px] text-base -2 -slate-200 focus:-blue-500 transition-all duration-200 resize-y"
                  rows={6}
                />
                <p className="text-sm ">Focus on actionable insights and preventive measures</p>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold ">Supporting Documents & Images</Label>
                <div className=" rounded-xl p-8 text-center hover:bg-blue-400 hover:50 transition-all duration-200 cursor-pointer">
                  <Upload className="w-12 h-12 500 mx-auto mb-4" />
                  <p className=" mb-2 text-lg font-medium">Drop files here or click to upload</p>
                  <p className=" text-sm mb-4">Support images, PDFs, documents, and text files</p>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-6 py-3 r from-blue-600 to-purple-600  rounded-xl cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium mt-10 lg hover:mt-10 xl transform hover:scale-105"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Choose Files
                  </Label>
                </div>

                {/* File Preview Grid */}
                {files.length > 0 && (
                  <div className="space-y-4">
                    <p className="font-semibold  text-lg">Selected Files ({files.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center p-4 r from-blue-50 to-indigo-50 rounded-xl  -blue-200 mt-10 sm">
                          {file.preview ? (
                            <div className="relative">
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded-lg mr-4 mt-10 md"
                              />
                              <div className="absolute -top-1 -right-1 w-6 h-6 500 rounded-full flex items-center justify-center">
                                <span className=" text-xs">📷</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-slate-200 rounded-lg mr-4 flex items-center justify-center mt-10 md">
                              <FileText className="w-8 h-8 " />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold  truncate">{file.name}</p>
                            <p className="text-xs ">{formatFileSize(file.size)}</p>
                            <p className="text-xs 600 capitalize">{file.type.split('/')[0]} file</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-8 h-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Section */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end pt-8 -t-2 -slate-100">
                <Link href="/mistakes">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto px-8 py-3 text-base -2 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 text-base r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 mt-10 lg hover:mt-10 xl transform hover:scale-105 transition-all duration-200 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Mistake Log...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📋</span>
                      Log This Mistake
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Helper Tips Card */}
      
      </div>
    </div>
  )
}