"use client";

import { useEffect, useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { getAllCategories } from "@/actions/categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Must be a valid URL").min(1, "URL is required").max(255),
  status: z.nativeEnum(ProductStatus),
  icon: z.string().max(255).optional().or(z.literal("")),
  image: z.string().max(255).optional().or(z.literal("")),
  categories: z.array(z.string()).optional(),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface categories {
  id: string;
  name: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: (products & { categories: categories[] }) | null;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<categories[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [imageSource, setImageSource] = useState<"url" | "upload">("url");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      status: "PENDING" as ProductStatus,
      icon: "",
      image: "",
      categories: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      
      if (initialData) {
        form.reset({
          title: initialData.title,
          url: initialData.url || "",
          status: initialData.status,
          icon: initialData.icon || "",
          image: initialData.image || "",
          categories: initialData.categories.map(cat => cat.id),
        });
        setImagePreview(initialData.image || null);
        setSelectedCategories(initialData.categories.map(cat => cat.id));
        // Determine if initial image is from CDN or URL
        setImageSource(initialData.image?.includes('media-cdn.prabisha.com') ? "upload" : "url");
      } else {
        form.reset({
          title: "",
          url: "",
          status: "PENDING" as ProductStatus,
          icon: "",
          image: "",
          categories: [],
        });
        setImagePreview(null);
        setSelectedCategories([]);
        setImageSource("url");
      }
    }
  }, [initialData, form, isOpen]);

  const fetchCategories = async () => {
    try {
      const response = await getAllCategories();
      if (!response) return null;
      setCategories(response);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload/media-p-cdn', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-upload-folder': 'products',
        },
      });

      if (response.data.success) {
        form.setValue('image', response.data.url);
        setImagePreview(response.data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);

      const cleanedData = {
        ...data,
        icon: data.icon || null,
        image: data.image || null,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      };

      const response = initialData
        ? await axios.patch(`/api/our-products/${initialData.id}`, cleanedData)
        : await axios.post("/api/our-products", cleanedData);

      console.log("API Success:", response.data);
      
      toast.success(toastMessage);
      onSuccess();
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

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const clearImage = () => {
    form.setValue('image', '');
    setImagePreview(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Product Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Tabs value={imageSource} onValueChange={(value) => setImageSource(value as "url" | "upload")}>
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="url" className="flex items-center gap-1">
                                <LucideIcons.Link className="h-4 w-4" />
                                Image URL
                              </TabsTrigger>
                              <TabsTrigger value="upload" className="flex items-center gap-1">
                                <LucideIcons.Upload className="h-4 w-4" />
                                Upload an Image
                              </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="url" className="space-y-2">
                              <Input
                                disabled={loading}
                                placeholder="https://example.com/image.jpg"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  handleImageUrlChange(e.target.value);
                                }}
                              />
                              <FormDescription>
                                Enter a URL to an image (max 255 characters)
                              </FormDescription>
                            </TabsContent>
                            
                            <TabsContent value="upload" className="space-y-2">
                              <div className="flex flex-col items-center justify-center border-2 border-dashed  rounded-lg p-6">
                                {imagePreview && imageSource === "upload" ? (
                                  <div className="relative w-full">
                                    <div className="relative w-full h-40 border rounded-md bg-muted overflow-hidden">
                                      <img
                                        src={imagePreview}
                                        alt="Image preview"
                                        className="w-full h-full object-cover"
                                        onError={() => setImagePreview(null)}
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => {
                                        form.setValue('image', '');
                                        setImagePreview(null);
                                      }}
                                    >
                                      <LucideIcons.Trash2 className="h-4 w-4 mr-1" />
                                      Remove Image
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <LucideIcons.Image className="h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 mb-3">
                                      Upload an image
                                    </p>
                                    <input
                                    
                                      type="file"
                                      ref={fileInputRef}
                                      className="hidden "
                                      accept="image/*"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleImageUpload(e.target.files[0]);
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={uploadingImage || loading}
                                      onClick={() => fileInputRef.current?.click()}
                                      className="flex items-center gap-2"
                                    >
                                      {uploadingImage ? (
                                        <>
                                          <LucideIcons.Loader2 className="h-4 w-4 animate-spin" />
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          <LucideIcons.CloudUpload className="h-4 w-4" />
                                          Choose Image
                                        </>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                              <FormDescription>
                                Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB
                              </FormDescription>
                            </TabsContent>
                          </Tabs>
                          
                          {imagePreview && (
                            <div className="relative w-full h-40 border rounded-md bg-muted overflow-hidden">
                              <img
                                src={imagePreview}
                                alt="Image preview"
                                className="w-full h-full object-cover"
                                onError={() => setImagePreview(null)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                                onClick={clearImage}
                              >
                                <LucideIcons.X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem className="col-span-2">
                  <FormLabel>Categories</FormLabel>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={loading}
                          className="w-full justify-between"
                        >
                          {selectedCategories.length > 0
                            ? `${selectedCategories.length} selected`
                            : "Select categories..."}
                          <LucideIcons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandList>
                          <CommandEmpty>No categories found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.id}
                                value={category.id}
                                onSelect={() => {
                                  toggleCategory(category.id);
                                }}
                              >
                                <LucideIcons.Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedCategories.includes(category.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {category.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select categories for this product
                  </FormDescription>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCategories.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId);
                      return (
                        <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                          {category?.name || categoryId}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => toggleCategory(categoryId)}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </FormItem>
              </div>

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