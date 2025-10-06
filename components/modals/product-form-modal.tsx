"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { products, ProductStatus } from "@prisma/client";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Must be a valid URL").min(1, "URL is required").max(255),
  status: z.nativeEnum(ProductStatus),
  icon: z.string().max(255).optional().or(z.literal("")),
  image: z.string().max(255).optional().or(z.literal("")),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: products | null;
}

// Popular icons for products
const POPULAR_ICONS = [
  "Package", "Box", "ShoppingCart", "Store", "Briefcase",
  "Laptop", "Smartphone", "Headphones", "Camera", "Monitor",
  "Cpu", "HardDrive", "Keyboard", "Mouse", "Printer",
  "Wallet", "CreditCard", "Coins", "DollarSign", "TrendingUp",
  "Star", "Heart", "CheckCircle", "Award", "Target"
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const title = initialData ? "Edit product" : "Create product";
  const description = initialData
    ? "Edit an existing product."
    : "Add a new product.";
  const toastMessage = initialData ? "Product updated." : "Product created.";
  const action = initialData ? "Save changes" : "Create";

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      status: "PENDING" as ProductStatus,
      icon: "",
      image: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          title: initialData.title,
          url: initialData.url || "",
          status: initialData.status,
          icon: initialData.icon || "",
          image: initialData.image || "",
        });
        setImagePreview(initialData.image || null);
      } else {
        form.reset({
          title: "",
          url: "",
          status: "PENDING" as ProductStatus,
          icon: "",
          image: "",
        });
        setImagePreview(null);
      }
    }
  }, [initialData, form, isOpen]);

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);

      const cleanedData = {
        ...data,
        icon: data.icon || null,
        image: data.image || null,
      };

      const response = initialData
        ? await axios.patch(`/api/our-products/${initialData.id}`, cleanedData)
        : await axios.post("/api/our-products", cleanedData);

      console.log("API Success:", response.data);
      
      

      toast.success(toastMessage);
      onClose();
    } catch (error) {
      console.error("Full error:", error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setImagePreview(null);
      onClose();
    }
  };

  const handleImageUrlChange = (url: string) => {
    if (url && url.trim()) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Product name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Icon</FormLabel>
                    <Popover open={iconOpen} onOpenChange={setIconOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={loading}
                            className="justify-between"
                          >
                            {field.value ? (
                              <div className="flex items-center gap-2">
                                {renderIcon(field.value)}
                                <span>{field.value}</span>
                              </div>
                            ) : (
                              "Select icon..."
                            )}
                            <LucideIcons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Search icon..." />
                          <CommandList>
                            <CommandEmpty>No icon found.</CommandEmpty>
                            <CommandGroup>
                              {POPULAR_ICONS.map((iconName) => (
                                <CommandItem
                                  key={iconName}
                                  value={iconName}
                                  onSelect={() => {
                                    field.onChange(iconName);
                                    setIconOpen(false);
                                  }}
                                >
                                  <LucideIcons.Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === iconName
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex items-center gap-2">
                                    {renderIcon(iconName)}
                                    <span>{iconName}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Choose a Lucide icon for your product
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          disabled={loading}
                          placeholder="https://example.com/image.jpg or /images/product.jpg"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleImageUrlChange(e.target.value);
                          }}
                        />
                        {imagePreview && (
                          <div className="relative w-full h-32 border rounded-md bg-muted overflow-hidden">
                            <img
                              src={imagePreview}
                              alt="Image preview"
                              className="w-full h-full object-cover"
                              onError={() => setImagePreview(null)}
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter a URL or path to a product image (max 255 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(ProductStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-6">
                <Button
                  disabled={loading}
                  variant="outline"
                  onClick={handleClose}
                  type="button"
                >
                  Cancel
                </Button>
                <Button disabled={loading} type="submit">
                  {action}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};