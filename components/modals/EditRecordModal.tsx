// components/modals/EditRecordModal.tsx

"use client";

import { useState, FormEvent, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { ClientData } from "@/app/(pages)/workspaces/clients/_components/client.coloumn";

interface EditRecordModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  record: ClientData | null;
  onRecordUpdated: () => void;
}

export function EditRecordModal({ isOpen, setIsOpen, record, onRecordUpdated }: EditRecordModalProps) {
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
    if (!record || !formData.name?.trim()) return toast.error("Name cannot be empty.");
    setIsLoading(true);

    const payload = { id: record.id, type: record.__type, ...formData };

    toast.promise(
      fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error || "Failed to update.");
        return response.json();
      }),
      {
        loading: "Updating record...",
        success: (data) => {
          onRecordUpdated();
          setIsOpen(false);
          return `Record "${data.name}" updated successfully!`;
        },
        error: (err) => err.message,
        finally: () => setIsLoading(false),
      }
    );
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