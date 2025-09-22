// /app/dashboard/clients/new/page.tsx

"use client";

import { CreateClientForm } from "@/components/modals/create-client-form";
import { CreateClientValue } from "@/lib/zod";
import { toast } from "sonner"; // Using sonner for notifications

export default function CreateClientPage() {
  
  // This function will be passed to the form component
  const handleCreateClient = async (values: CreateClientValue) => {
    try {
      const response = await fetch('/api/users/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        // If the server response is not OK, get the error text
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create client.");
      }

      const newUser = await response.json();
      toast.success(`Client "${newUser.name}" created successfully!`);
      
      // Optionally, you can redirect the user or reset the form here

    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Create a New Client</h1>
      <p className="text-muted-foreground mb-6">
        Fill out the form below to add a new client user to the system.
      </p>
      <CreateClientForm onSubmit={handleCreateClient} />
    </div>
  );
}