// /components/modals/AddTaskDialog.tsx
"use client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Bug, Lightbulb, Wrench, Target, FolderOpen, Building } from "lucide-react";
import { cn } from "@/lib/utils";

// Your types and schemas
import { Project, User, Priority, TaskStatus } from "@/types";
import {
  taskFormSchema,
  TaskFormData,
  TaskFormInput,
  attachmentSchema,
} from "@/lib/zod";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/shadcn-io/dropzone";
import { toast } from "sonner";
import z from "zod";
import { TaskType } from "@prisma/client";

// --- Props Interface ---
interface TaskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
}

// --- Type for the API response needed by the form ---
interface FormContextData {
  projects: (Project & { department?: { id: string; name: string } | null })[];
  currentUser: User;
  departments: { id: string; name: string }[];
  userDepartment: { id: string; name: string } | null;
}

// --- SWR Fetcher Function ---
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Main Dialog Component ---
export function TaskFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
}: TaskFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showTaskType, setShowTaskType] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetches data only when the dialog is open
  const {
    data: formContextData,
    error,
    isLoading,
  } = useSWR<FormContextData>(
    isOpen ? `/api/tasks/form-context` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Initialize form with default values including current date
  const form = useForm<TaskFormInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      priority: Priority.MEDIUM,
      status: TaskStatus.TO_DO,
      startDate: new Date(), // Set to current date by default
      taskType: TaskType.TASK,
      departmentId: formContextData?.userDepartment?.id || "",
    },
  });

  const projects = formContextData?.projects || [];
  const departments = formContextData?.departments || [];
  const userDepartment = formContextData?.userDepartment || null;
  const currentUser = formContextData?.currentUser;
  const watchedProjectId = form.watch("projectId");
  const watchedDepartmentId = form.watch("departmentId");

  // Initialize form with user's department when data loads
  useEffect(() => {
    if (formContextData && userDepartment && !isInitialized) {
      form.setValue("departmentId", userDepartment.id, { shouldDirty: false });
      setIsInitialized(true);
      
      // Show task type if user's department is IT
      setShowTaskType(userDepartment.name === "IT");
    }
  }, [formContextData, userDepartment, form, isInitialized]);

  // Reset initialization state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen]);

  // Show task type only if department is IT
  useEffect(() => {
    if (watchedDepartmentId) {
      const selectedDepartment = departments.find(
        (dept) => dept.id === watchedDepartmentId
      );
      setShowTaskType(selectedDepartment?.name === "IT");
    } else {
      setShowTaskType(false);
    }
  }, [watchedDepartmentId, departments]);

  // Update form when project is selected
  useEffect(() => {
    if (!formContextData) return;

    const selectedProject = projects.find((p) => p.id === watchedProjectId);

    if (selectedProject && currentUser) {
      const projectUsers = selectedProject.members.map((member) => member.user);
      const projectLead = selectedProject.members.find(
        (m) => m.role === "LEAD"
      )?.user;

      // Set default reporter and assignee
      form.setValue("reporterId", projectLead?.id || "");
      const isCurrentUserMember = projectUsers.some(
        (user) => user.id === currentUser.id
      );
      form.setValue(
        "assigneeId",
        isCurrentUserMember ? currentUser.id : undefined
      );

      // Set department to project's department if it exists, otherwise keep current
      if (selectedProject.department) {
        form.setValue("departmentId", selectedProject.department.id, { shouldDirty: false });
      }
    } else {
      // Reset dependent fields if no project is selected
      form.resetField("reporterId");
      form.resetField("assigneeId");
      // Reset to user's department if no project is selected
      if (userDepartment) {
        form.setValue("departmentId", userDepartment.id, { shouldDirty: false });
      }
    }
  }, [watchedProjectId, projects, currentUser, form, formContextData, userDepartment]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset({
        priority: Priority.MEDIUM,
        status: TaskStatus.TO_DO,
        startDate: new Date(), // Reset to current date
        taskType: TaskType.TASK,
        departmentId: userDepartment?.id || "",
      });
      setFiles([]);
      setIsInitialized(false);
    }
  }, [isOpen, form, userDepartment?.id]);

  const handleFormSubmit = async (data: TaskFormInput) => {
    setIsSubmitting(true);
    try {
      let attachmentsData: z.infer<typeof attachmentSchema>[] = [];

      // --- 1. UPLOAD FILES VIA YOUR NEW BACKEND ENDPOINT ---
      if (files.length > 0) {
        toast.info(`Uploading ${files.length} file(s)...`);

        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          // Call your new upload API route
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(
              errorBody.message || `Failed to upload ${file.name}`
            );
          }

          const result = await response.json(); // Expects { url: '...' }

          // Return the metadata object in the format your Zod schema expects
          return {
            url: result.url,
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
          };
        });

        attachmentsData = await Promise.all(uploadPromises);
        toast.success("Uploads complete!");
      }

      // --- 2. COMBINE FORM DATA AND ATTACHMENT DATA ---
      const finalData: TaskFormInput = {
        ...data,
        attachments: attachmentsData,
      };
      const parsedData: TaskFormData = taskFormSchema.parse(finalData);

      // --- 3. SEND METADATA TO THE TASKS API ---
      await onSubmit(parsedData); // This calls POST /api/tasks

      form.reset();
      setFiles([]);
      setIsInitialized(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Submission failed:", error);
      toast.error(
        error instanceof Error ? error.message : "An error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        {isLoading && <FormSkeleton />}
        {error && (
          <div className="p-4 text-center text-red-500">
            Failed to load form data. Please try again.
          </div>
        )}
        {!isLoading && !error && formContextData && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <div className="space-y-4">
                {/* Essential Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="title"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="What needs to be done?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="projectId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Assignment Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="assigneeId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign To</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                          disabled={!watchedProjectId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {((selectedProject) =>
                              selectedProject
                                ? selectedProject.members.map((m) => (
                                    <SelectItem
                                      key={m.user.id}
                                      value={m.user.id}
                                    >
                                      {m.user.name}
                                    </SelectItem>
                                  ))
                                : null)(
                              projects.find((p) => p.id === watchedProjectId)
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="priority"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(Priority).map((p) => (
                              <SelectItem key={p} value={p}>
                                {p.charAt(0) + p.slice(1).toLowerCase()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Department and Task Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    name="departmentId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                          defaultValue={userDepartment?.id || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4" />
                                  {dept.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Task Type Field - Conditionally shown for IT department */}
                  {showTaskType && (
                    <FormField
                      name="taskType"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={TaskType.TASK}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select task type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={TaskType.TASK}>
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4" />
                                  Task
                                </div>
                              </SelectItem>
                              <SelectItem value={TaskType.BUG}>
                                <div className="flex items-center gap-2">
                                  <Bug className="h-4 w-4" />
                                  Bug
                                </div>
                              </SelectItem>
                              <SelectItem value={TaskType.FEATURE}>
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="h-4 w-4" />
                                  Feature
                                </div>
                              </SelectItem>
                              <SelectItem value={TaskType.IMPROVEMENT}>
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Improvement
                                </div>
                              </SelectItem>
                              <SelectItem value={TaskType.EPIC}>
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  Epic
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {/* Time Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    name="estimatedHours"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="4"
                            onChange={(event) =>
                              field.onChange(event.target.value)
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            min={0}
                            step="0.1"
                            inputMode="decimal"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="startDate"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value as Date, "MMM d")
                                ) : (
                                  <span>Today</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value as Date | undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="dueDate"
                    control={form.control}
                    render={({ field }) => {
                      // Get startDate from form and assert type
                      const startDate = form.getValues("startDate") as Date | null | undefined;

                      // Compute minDueDate = startDate + 3 hours
                      const minDueDate = startDate
                        ? new Date(startDate.getTime() + 3 * 60 * 60 * 1000)
                        : undefined;

                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? format(field.value as Date, "MMM d")
                                    : <span>Set date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value as Date | undefined}
                                onSelect={(date) => {
                                  if (!date) return;
                                  // enforce minimum 3-hour difference
                                  if (minDueDate && date < minDueDate) {
                                    field.onChange(minDueDate);
                                  } else {
                                    field.onChange(date);
                                  }
                                }}
                                // Disable all dates before minDueDate
                                disabled={(date) => minDueDate ? date < minDueDate : false}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>
                
                {/* Description */}
                <FormField
                  name="description"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add details..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Attachments */}
                <Dropzone
                  src={files}
                  onDrop={(acceptedFiles) => setFiles(acceptedFiles)}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024}
                  onError={(err) => toast.error(err.message)}
                >
                  <DropzoneContent />
                  <DropzoneEmptyState />
                </Dropzone>
              </div>
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Task
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Simplified Skeleton Loader Component ---
const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);