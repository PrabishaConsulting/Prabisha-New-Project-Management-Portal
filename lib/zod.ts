// /lib/validators/task.ts

import { z } from 'zod';
import { Priority, TaskStatus } from '@/types'; // Use your actual path

export const attachmentSchema = z.object({
  filename: z.string(),
  url: z.string().url(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
});

export const taskFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  projectId: z.string({ message: "Please select a project." }).nonempty("Please select a project."),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  reporterId: z.string({ message: "A reporter must be selected." }).nonempty("A reporter must be selected."),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TO_DO), 
  estimatedHours: z.coerce
    .number({ message: "Must be a number." })
    .min(0, "Hours cannot be negative.")
    .optional(),
  // --- FIX: Use z.coerce.date() to handle string inputs ---
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
    attachments: z.array(attachmentSchema).optional(),

}).refine((data) => {
  if (data.startDate && data.dueDate) {
    const minDue = new Date(data.startDate.getTime() + 3 * 60 * 60 * 1000);
    return data.dueDate >= minDue;
  }
  return true;
}, {
  message: "Due date must be at least 3 hours after the start date.",
  path: ["dueDate"],
});

// Output type (after parsing/defaults)
export type TaskFormData = z.infer<typeof taskFormSchema>;
// Input type (what RHF receives before parsing/coercion/defaults)
export type TaskFormInput = z.input<typeof taskFormSchema>;




// Define constraints for the image file
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const UpdateProfileSchemaForProfile = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  // Add the profileImage field. It's optional.
  profileImage: z
    .any()
    // You can't check instanceof(File) on the client easily, so `any` is fine here.
    // We add refinements to validate the file if it exists.
    .refine(
      (file) => !file || file?.size <= MAX_FILE_SIZE,
      `Max image size is 5MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    )
    .optional(),
});




// src/lib/schemas.ts


// Define the allowed enum values for a task status
const taskStatusEnum = z.enum([
  'TO_DO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE'
]);

// Schema to validate the body of the PUT request for updating a task status
export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

// We can also infer the TypeScript type from the schema if needed elsewhere
export type UpdateTaskStatusDto = z.infer<typeof updateTaskStatusSchema>;


// /lib/schemas/user-schemas.ts


// Enums based on your Prisma Schema
export enum UserType {
  INTERNAL = "INTERNAL",
  CLIENT = "CLIENT",
}

export enum Role {
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
}

// Zod schema for validating the new client form
export const CreateClientSchema = z.object({
  name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

// TypeScript type inferred from the schema
export type CreateClientValue = z.infer<typeof CreateClientSchema>;