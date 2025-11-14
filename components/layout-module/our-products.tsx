"use client";

import { useState, useEffect } from "react";
import { Grid3x3, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

interface Product {
  image: any;
  id: string;
  title: string;
  status: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/v1/get/our-products/all-data?status=ACTIVE&category=internaltools&page=1&limit=30",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer 1S8mhB0OAhMpUOl8sY5NUQn16fQ1Tq0xJeiAidHWQ3U=`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch products");
      
      const data = await response.json();
      console.log(data, "data");
      setProducts(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <Sheet>
      {/* Trigger Button */}
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="bg-secondary rounded-full hover:bg-primary"
        >
          <Grid3x3 className="w-5 h-5" />
        </Button>
      </SheetTrigger>

      {/* Sheet Panel */}
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="p-6 border-b border-border bg-muted/30">
          <SheetTitle className="text-2xl font-bold">
            Prabisha Products
          </SheetTitle>
          <SheetDescription className="text-sm">
            {products.length} {products.length === 1 ? "app" : "apps"} available
          </SheetDescription>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <p className="text-red-600 font-medium">
                  Failed to load products
                </p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button onClick={fetchProducts} className="mt-4">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && products.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No one is listed</p>
            </div>
          )}

          {/* Product Grid */}
          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product, index) => (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block p-4 bg-background rounded-lg border hover:shadow transition-all"
                >
                  {/* Index */}
                  <span className="absolute top-2 left-2 text-xs text-muted-foreground">
                    {index + 1}
                  </span>

                  <div className="flex flex-col items-center gap-3 mt-2 text-center">
                    {/* Image */}
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={100}
                          height={100}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Grid3x3 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Text */}
                    <div>
                      <h3 className="text-sm font-medium capitalize">
                        {product.title}
                      </h3>
                      <span
                        className={`mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === "ACTIVE"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <SheetClose className="absolute top-4 right-4">
          <X className="w-5 h-5" />
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
