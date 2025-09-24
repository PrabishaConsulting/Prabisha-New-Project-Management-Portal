// components/modals/EditRecordModal.tsx

"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import the router
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ClientData } from "@/app/(pages)/workspaces/clients/_components/client.coloumn"; // Corrected path
import { updateAccount } from "@/actions/update-client-action"; // Corrected path to your actions file

interface EditRecordModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  record: ClientData | null;
}

export function EditRecordModal({ isOpen, setIsOpen, record }: EditRecordModalProps) {
  const router = useRouter(); // Initialize the router to refresh the page
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", industry: "", location: "" });

  useEffect(() => {
    if (record) {
      setFormData({
        name: record.name ?? "",
        email: record.email ?? "",
        industry: record.industry ?? "",
        location: record.location ?? "",
      });
    }
  }, [record]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!record || !formData.name?.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsLoading(true);

    // --- FIX: Use the Server Action directly instead of fetch ---
    const result = await updateAccount(record.id, record.__type, formData);

    if (result.success) {
      toast.success(`Record "${formData.name}" updated successfully!`);
      setIsOpen(false);
      
      // This is the correct way to refresh the data on the page
      router.refresh(); 
    } else {
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit {record?.__type === 'CLIENT' ? 'Client' : 'Internal Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">Email</Label>
              <Input id="edit-email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-industry" className="text-right">Industry</Label>
              <Input id="edit-industry" value={formData.industry} onChange={(e) => handleInputChange("industry", e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-location" className="text-right">Location</Label>
              <Input id="edit-location" value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}