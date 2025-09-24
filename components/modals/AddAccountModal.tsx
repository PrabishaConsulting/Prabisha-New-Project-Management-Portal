// components/modals/AddAccountModal.tsx

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createAccount } from "@/actions/update-client-action";

interface AddAccountModalProps {
  accountType: 'CLIENT' | 'INTERNAL_PRODUCT';
  buttonText: string;
}

export function AddAccountModal({ accountType, buttonText }: AddAccountModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", industry: "", location: "" });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", email: "", industry: "", location: "" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await createAccount(accountType, formData);

    if (result.success) {
      toast.success(`Account "${formData.name}" added successfully!`);
      setIsOpen(false);
      resetForm();
      // This soft refresh updates the UI without a jarring full-page reload
      router.refresh(); 
    } else {
      toast.error(result.error);
    }
    
    setIsLoading(false);
  };
  
  const handleModalClose = (open: boolean) => {
    if (!open && !isLoading) resetForm();
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" type="button">
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New {accountType === 'CLIENT' ? 'Client' : 'Internal Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-name" className="text-right">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="col-span-3"
                placeholder="e.g., New Client Inc."
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-email" className="text-right">Email</Label>
              <Input
                id="product-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="col-span-3"
                placeholder="contact@example.com"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-industry" className="text-right">Industry</Label>
              <Input
                id="product-industry"
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                className="col-span-3"
                placeholder="e.g., E-commerce, Healthcare"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-location" className="text-right">Location</Label>
              <Input
                id="product-location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="col-span-3"
                placeholder="e.g., New York, USA"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleModalClose(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
              ) : (
                "Add Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}