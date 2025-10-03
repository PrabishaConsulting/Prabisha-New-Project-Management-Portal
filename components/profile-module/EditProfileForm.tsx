"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useTransition, useState, useEffect } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react"; // Import icons for better UI

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { updateProfile } from "@/actions/user";
import { UpdateProfileSchema } from "./schemas";
import { useSession } from "next-auth/react";

type CurrentUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  image?: string | null;
};

export default function EditProfileForm({
  profileId,
  currentUser,
}: {
  profileId: string;
  currentUser: CurrentUser;
}) {
  const { data: session, update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(
    currentUser.avatar || null
  );

  const form = useForm<z.infer<typeof UpdateProfileSchema>>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: currentUser.name || "",
      avatar: undefined,
    },
  });

  // Destructure isDirty to track if the form has been changed
  const {
    formState: { isDirty },
  } = form;

  // Efficiency: Prevent memory leaks by revoking the object URL
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function onSubmit(values: z.infer<typeof UpdateProfileSchema>) {
    // If nothing has changed, don't do anything
    if (!isDirty) {
      return;
    }

    startTransition(async () => {
      let avatarUrl: string | undefined | null = undefined;

      // Step 1: Handle avatar changes (upload or removal)
      if (form.getFieldState("avatar").isDirty) {
        if (values.avatar) {
          // Case 1: A new avatar was uploaded
          const imageFormData = new FormData();
          imageFormData.append("avatar", values.avatar);

          try {
            const response = await fetch(
              `/api/users/${profileId}/user-profile`,
              {
                method: "POST",
                body: imageFormData,
              }
            );
            const result = await response.json();

            if (!response.ok) {
              toast.error("Image Upload Failed", { description: result.error });
              return;
            }
            avatarUrl = result.imageUrl; // Get URL from Supabase API route
          } catch (error) {
            toast.error("Image Upload Failed", {
              description: "Could not connect to the server.",
            });
            return;
          }
        } else {
          // Case 2: The avatar was removed
          avatarUrl = null; // Use null to signify deletion
        }
      }

      // Step 2: Call the Server Action with the final data
      const result = await updateProfile(profileId, {
        name: values.name,
        // Pass the new URL, null for removal, or undefined if unchanged
        avatar: avatarUrl,
      });

      if (result?.success) {
        toast.success("Success", { description: result.success });
        await update({ avatar: avatarUrl });
        form.reset({ name: values.name, avatar: undefined }); // Reset dirty state
      } else if (result?.error) {
        toast.error("Error", { description: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your personal information and avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormDescription>
                    For best results, upload a{" "}
                    <span className="font-medium">512×512</span> square image.
                  </FormDescription>
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <Avatar className="h-24 w-24">
                        <AvatarImage
                          className="object-cover group-hover:opacity-60 transition-opacity"
                          src={preview || undefined}
                          alt="profile image"
                        />
                        <AvatarFallback className="group-hover:opacity-60 transition-opacity">
                          {currentUser.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="h-6 w-6" />
                        <FormControl>
                          <Input
                            id="avatar-upload"
                            type="file"
                            className="sr-only" // Hide the ugly default input
                            accept="image/png, image/jpeg, image/jpg"
                            disabled={isPending}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              if (file) {
                                setPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </FormControl>
                      </label>
                    </div>
                    {preview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => {
                          setPreview(null);
                          form.setValue("avatar", null as any, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your full name"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={!isDirty || isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
