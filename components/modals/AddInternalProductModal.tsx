"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";

interface AddInternalProductModalProps {
  onProductAdded: () => void; // Callback to refresh the product list
  name : string | undefined;
}

export function AddInternalProductModal({ onProductAdded , name }: AddInternalProductModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    industry: "",
    location: ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      industry: "",
      location: ""
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Product name cannot be empty.");
      return;
    }
    setIsLoading(true);

    toast.promise(
      fetch("/api/internal-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add product.");
        }
        return response.json();
      }),
      {
        loading: "Adding product...",
        success: () => {
          onProductAdded(); // Call the refresh callback
          setIsOpen(false); // Close modal
          resetForm(); // Reset form
          setIsLoading(false);
          return `Product "${formData.name}" added successfully!`;
        },
        error: (err) => {
          setIsLoading(false);
          return err.message;
        },
      }
    );
  };

  const handleModalClose = (open: boolean) => {
    if (!open && !isLoading) {
      resetForm();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" type="button">
          <Plus className="h-4 w-4" />
          {name ? name : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Internal Product</DialogTitle>
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
                placeholder="e.g., EcoKart Ecommerce"
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product-email" className="text-right">
                Email
              </Label>
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
              <Label htmlFor="product-industry" className="text-right">
                Industry
              </Label>
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
              <Label htmlFor="product-location" className="text-right">
                Location
              </Label>
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
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleModalClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Product"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}