// components/modals/DeleteConfirmationModal.tsx (new file)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/actions/update-client-action";
import { ClientData } from "@/app/(pages)/workspaces/clients/_components/client.coloumn"; // Adjust path if needed

interface DeleteConfirmationModalProps {
  record: ClientData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteConfirmationModal({ record, isOpen, onClose }: DeleteConfirmationModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!record) return;

    setIsLoading(true);
    const result = await deleteAccount(record.id, record.__type);

    if (result.success) {
      toast.success(`Record "${record.name}" deleted successfully.`);
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the account for 
            <span className="font-semibold"> {record?.name}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}