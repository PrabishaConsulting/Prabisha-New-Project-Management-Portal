"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarIcon,
  Paperclip,
  Building,
  Flag,
  X,
  UploadCloud,
  User2,
  FolderOpen,
  Bug,
  Lightbulb,
  Wrench,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import {
  type ProjectMember,
  type User,
  type TaskStatus,
  type Department,
} from "@prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import all required components from shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type MemberWithUser = ProjectMember & { user: User };

// Add TaskType enum
enum TaskType {
  TASK = "TASK",
  BUG = "BUG",
  FEATURE = "FEATURE",
  IMPROVEMENT = "IMPROVEMENT",
  EPIC = "EPIC",
}

// FIXED: Added estimatedMinutes to the form schema
const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.date(),
  assigneeId: z.string(),
  departmentId: z.string(),
  taskType: z.nativeEnum(TaskType),
  estimatedMinutes: z.number().min(1), // Added this field
});

const attachmentSchema = z.object({
  url: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
});

interface NewTaskDialogProps {
  projectId: string;
  status: TaskStatus;
  reporterId: string;
  members: MemberWithUser[];
  departments: Department[];
  userDepartment?: Department | null; // Add user department prop
  onTaskCreated: (newTask: any) => void;
  children: React.ReactNode;
}

const priorityOptions = [
  {
    value: "LOW",
    label: "Low",
    icon: (
      <Flag className="h-4 w-4 border-green-500/50 bg-green-500/10 text-green-700" />
    ),
  },
  { value: "MEDIUM", label: "Medium", icon: <Flag className="h-4 w-4" /> },
  { value: "HIGH", label: "High", icon: <Flag className="h-4 w-4" /> },
  { value: "URGENT", label: "Urgent", icon: <Flag className="h-4 w-4" /> },
];

const taskTypeOptions = [
  {
    value: TaskType.TASK,
    label: "Task",
    icon: <FolderOpen className="h-4 w-4" />,
  },
  { value: TaskType.BUG, label: "Bug", icon: <Bug className="h-4 w-4" /> },
  {
    value: TaskType.FEATURE,
    label: "Feature",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    value: TaskType.IMPROVEMENT,
    label: "Improvement",
    icon: <Wrench className="h-4 w-4" />,
  },
  { value: TaskType.EPIC, label: "Epic", icon: <Target className="h-4 w-4" /> },
];

export function NewTaskDialog({
  projectId,
  status,
  reporterId,
  members,
  departments,
  userDepartment,
  onTaskCreated,
  children,
}: NewTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [showTaskType, setShowTaskType] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      assigneeId: "",
      departmentId: userDepartment?.id || "",
      taskType: TaskType.TASK,
      estimatedMinutes: undefined, // Added this field
    },
  });

  // Watch department changes to show/hide task type
  const watchedDepartmentId = form.watch("departmentId");

  // Set default department and check if it's IT when dialog opens
  useEffect(() => {
    if (open && userDepartment) {
      form.setValue("departmentId", userDepartment.id);
      setShowTaskType(userDepartment.name === "IT");
    }
  }, [open, userDepartment, form]);

  // Update showTaskType when department changes
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

  const handleRemoveFile = (fileName: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      let attachmentsData: z.infer<typeof attachmentSchema>[] = [];

      if (files.length > 0) {
        toast.info(`Uploading ${files.length} file(s)...`);

        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(
              errorBody.message || `Failed to upload ${file.name}`
            );
          }

          const result = await response.json();
          if (!result.url) {
            throw new Error(
              `Upload server did not return a URL for ${file.name}`
            );
          }

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

      const finalPayload = {
        ...values,
        status,
        reporterId,
        projectId,
        attachments: attachmentsData,
      };

      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Failed to create task");
      }

      const data = await response.json();

      toast.success("Task created successfully!");
      form.reset();
      setFiles([]);
      onTaskCreated(data);
      setOpen(false);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      {/* Increased width for a better layout */}
      <DialogContent className="sm:max-w-2xl z-50 ">
        <DialogHeader>
          <DialogTitle>Add a new Task</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new task in the "
            {status.replace("_", " ")}" column.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          {/* Added a scrollable area for smaller screens */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pr-2 max-h-[65vh] overflow-y-auto z-auto"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Finalize Q3 budget report"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grouped Assignee and Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User2 className="h-4 w-4" /> Assign to
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((mem) => (
                          <SelectItem key={mem.userId} value={mem.userId}>
                            {mem.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building className="h-4 w-4" /> Department
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Grouped Estimated Minutes and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="estimatedMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Time (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 60"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : undefined);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {option.icon}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            {/* Task Type Dropdown (conditionally shown) */}
            {showTaskType && (
              <FormField
                control={form.control}
                name="taskType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              {option.icon}
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Due Date */}
          

            {/* New Attachment Dropzone */}
            <FormItem>
              <FormLabel>Attachments</FormLabel>
              <FormControl>
                <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, PDF, etc.
                    </p>
                  </div>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) =>
                      setFiles(e.target.files ? Array.from(e.target.files) : [])
                    }
                  />
                </label>
              </FormControl>
              <FormMessage />
              {files.length > 0 && (
                <div className="pt-2 space-y-2">
                  <FormLabel className="text-sm font-medium">
                    Selected Files:
                  </FormLabel>
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-2 text-sm rounded-md bg-muted"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(file.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveFile(file.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </FormItem>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}