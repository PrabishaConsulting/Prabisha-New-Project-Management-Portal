// components/project-edit-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Project,
  User,
  Department,
  ProjectMember as ProjectMemberWithUser,
  ProjectRole,
  ProjectStatus,
  Priority,
  ProjectType,
  InternalProduct,
} from "@prisma/client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { X, UserPlus, Calendar as CalendarIcon } from "lucide-react";

// Import local utilities and shadcn/ui components
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "../ui/checkbox";

// --- TYPE DEFINITIONS ---
type internalProducts = Pick<InternalProduct, "id" | "name">;
type DropdownDepartment = Pick<Department, "id" | "name">;
type FormUser = Pick<User, "id" | "name" | "email">;

// This type now includes the department relation for displaying the current department
type ProjectWithDetails = Project & {
  members: (ProjectMemberWithUser & { user: User })[];
  department: Department | null;
  internalProduct: InternalProduct | null;
};

export const projectFormSchema = z
  .object({
    // --- Existing Fields ---
    name: z.string().min(1, "Name is required"),
    description: z.string().nullable().optional(),
    startDate: z.date().nullable().optional(),
    dueDate: z.date().nullable().optional(),
    status: z.nativeEnum(ProjectStatus),
    priority: z.nativeEnum(Priority),
    createdBy: z.string().cuid("Creator is required"),
    departmentId: z
      .string()
      .cuid("Invalid department ID")
      .nullable()
      .optional(),
    members: z.array(
      z.object({
        userId: z.string(),
        name: z.string(),
        role: z.nativeEnum(ProjectRole),
      })
    ),

    // --- New Fields ---
    projectType: z.nativeEnum(ProjectType, {
      error: () => ({ message: "Project type is required" }),
    }),
    isClientProject: z.boolean().default(false),
    clientId: z.string().cuid("Invalid client ID").nullable().optional(),
    internalProductId: z
      .string()
      .cuid("Invalid product ID")
      .nullable()
      .optional(),
    zohoFolderLink: z
      .union([
        z.string().url("Must be a valid URL"),
        z.literal(""),
        z.null(),
      ])
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    // --- Due Date Logic ---
    // 1. If a due date is set, a start date must also be set.
    if (data.dueDate && !data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A start date is required when a due date is set.",
        path: ["startDate"],
      });
    }

    // 2. If both dates are set, due date must be after or on the same day as the start date.
    if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date cannot be before the start date.",
        path: ["dueDate"],
      });
    }

    // --- Conditional Logic for New Fields ---
    // 3. If the project type is 'FIXED_TERM', a due date is required.
    if (data.projectType === ProjectType.FIXED_TERM && !data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A due date is required for Fixed Term projects.",
        path: ["dueDate"],
      });
    }

    // 4. If it's a client project, a client must be selected.
    if (data.isClientProject && !data.clientId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A client must be selected for client projects.",
        path: ["clientId"],
      });
    }
  });

// You can infer the type directly from the schema
export type ProjectFormData = z.infer<typeof projectFormSchema>;

// --- COMPONENT PROPS ---
interface ProjectEditFormProps {
  initialProject: ProjectWithDetails;
  allUsers: FormUser[];
  departments: DropdownDepartment[]; // Departments are now passed as a prop
  internalProducts: internalProducts[]; // Products are now passed as a prop
  allClients: FormUser[];
}

export function ProjectEditForm({
  initialProject,
  allUsers,
  departments,
  internalProducts,
  allClients,
}: ProjectEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema) as Resolver<ProjectFormData, any>,
    defaultValues: {
      // --- Existing Values ---
      name: initialProject.name,
      description: initialProject.description ?? "",
      startDate: initialProject.startDate
        ? new Date(initialProject.startDate)
        : null,
      dueDate: initialProject.dueDate ? new Date(initialProject.dueDate) : null,
      status: initialProject.status,
      priority: initialProject.priority,
      createdBy: initialProject.createdBy,
      departmentId: initialProject.departmentId ?? undefined,
      members: initialProject.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name ?? "",
        role: m.role,
      })),

      // --- New Default Values ---
      projectType: initialProject.projectType,
      isClientProject: initialProject.isClientProject ?? false,
      clientId: initialProject.clientId ?? undefined,
      internalProductId: initialProject.internalProductId ?? undefined,
      zohoFolderLink: initialProject.zohoFolderLink ?? null,
    },
  });

  // Watch all fields that affect the form's display or require real-time calculation
  const [
    startDate,
    dueDate,
    watchMembers,
    projectTypeValue,
    isClientProjectValue,
  ] = watch([
    "startDate",
    "dueDate",
    "members",
    "projectType",
    "isClientProject",
  ]);

  const calculateDuration = () => {
    if (startDate && dueDate && dueDate >= startDate) {
      const days = differenceInDays(dueDate, startDate) + 1;
      return `${days} day(s)`;
    }
    return null;
  };

  const addMember = (user: FormUser) => {
    if (!watchMembers.some((m) => m.userId === user.id)) {
      setValue("members", [
        ...watchMembers,
        { userId: user.id, name: user.name ?? "", role: "MEMBER" },
      ]);
    }
  };

  const removeMember = (userId: string) => {
    setValue(
      "members",
      watchMembers.filter((m) => m.userId !== userId)
    );
  };

  const updateMemberRole = (userId: string, role: ProjectRole) => {
    setValue(
      "members",
      watchMembers.map((m) => (m.userId === userId ? { ...m, role } : m))
    );
  };

  const onSubmit = (data: ProjectFormData) => {
    startTransition(async () => {
      // Ensure zohoFolderLink is null if empty
      const payload = {
        ...data,
        zohoFolderLink: data.zohoFolderLink || null,
        members: data.members.map(({ userId, role }) => ({ userId, role })),
      };

      const response = await fetch(`/api/data/projects/${initialProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Project updated successfully!");
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error("Failed to update project.", {
          description: errorData.message || "An unknown error occurred.",
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* --- BASIC FIELDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="createdBy">Project Creator</Label>
          <Controller
            name="createdBy"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} rows={4} />
      </div>

      {/* --- CLASSIFICATION & DETAILS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status */}
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <div>
              <Label>Status</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        {/* Priority */}
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <div>
              <Label>Priority</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Priority).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        {/* NEW: Project Type */}
        <Controller
          name="projectType"
          control={control}
          render={({ field }) => (
            <div>
              <Label>Project Type</Label>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectType && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.projectType.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* --- CLIENT & INTERNAL ASSOCIATION --- */}
      <div className="space-y-6 rounded-md border p-4">
        <h3 className="text-lg font-medium">Project Association</h3>
        {/* NEW: Is Client Project Toggle */}
        <div className="flex items-center space-x-2">
          <Controller
            name="isClientProject"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="isClientProject"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <label
            htmlFor="isClientProject"
            className="text-sm font-medium leading-none"
          >
            This is a client project
          </label>
        </div>

        {/* NEW: Client Selector (Conditional) */}
        {isClientProjectValue && (
          <Controller
            name="clientId"
            control={control}
            render={({ field }) => (
              <div>
                <Label>Client</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : value)
                  }
                  defaultValue={field.value ?? "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.clientId.message}
                  </p>
                )}
              </div>
            )}
          />
        )}

        {/* Department & Internal Product */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Controller
            name="departmentId"
            control={control}
            render={({ field }) => (
              <div>
                <Label>Department</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : value)
                  }
                  defaultValue={field.value ?? "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          {/* NEW: Internal Product */}
          <Controller
            name="internalProductId"
            control={control}
            render={({ field }) => (
              <div>
                <Label>Internal Product</Label>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? null : value)
                  }
                  defaultValue={field.value ?? "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {internalProducts.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>
      </div>

      {/* --- DATE PICKERS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Start Date */}
        <Controller
          name="startDate"
          control={control}
          render={({ field }) => (
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ?? undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.startDate.message}
                </p>
              )}
            </div>
          )}
        />
        {/* Due Date (Conditional) */}
        {projectTypeValue === "FIXED_TERM" && (
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.dueDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            )}
          />
        )}
      </div>
      {/* Duration Calculation */}
      <div className="text-sm text-muted-foreground -mt-4">
        {calculateDuration() && (
          <p>
            <strong>Duration:</strong> {calculateDuration()}
          </p>
        )}
      </div>

      {/* --- EXTERNAL LINKS --- */}
      <div>
        <Label htmlFor="zohoFolderLink">Zoho Folder Link</Label>
        <Controller
          name="zohoFolderLink"
          control={control}
          render={({ field }) => (
            <>
              <Input
                id="zohoFolderLink"
                placeholder="https://workdrive.zoho.in/..."
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
              {errors.zohoFolderLink && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.zohoFolderLink.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      {/* --- MEMBERS MANAGEMENT --- */}
      <div>
        <h3 className="text-lg font-medium mb-2">Project Members</h3>
        <div className="space-y-3 rounded-md border p-4">
          {watchMembers.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-2"
            >
              <span className="font-medium">{member.name}</span>
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    updateMemberRole(member.userId, role as ProjectRole)
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember(member.userId)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {watchMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No members assigned.
            </p>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="mt-4">
              <UserPlus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Command>
              <CommandInput placeholder="Search users..." />
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {allUsers
                    .filter(
                      (user) => !watchMembers.some((m) => m.userId === user.id)
                    )
                    .map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => addMember(user)}
                      >
                        {user.name} ({user.email})
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* --- SUBMIT BUTTON --- */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}