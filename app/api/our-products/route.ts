import { db } from "@/lib/db";

import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductStatus } from "@prisma/client";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { User } from "lucide-react";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Must be a valid URL").min(1, "URL is required"),
  status: z.nativeEnum(ProductStatus),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    // Protect this route for ADMIN users only
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const body = await req.json();
    const validatedData = productSchema.parse(body);

    const product = await db.products.create({ data: validatedData });
    return NextResponse.json(product, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    console.error("[PRODUCTS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    // Protect this route for authenticated users
    if (!user) {
       return new NextResponse("Unauthorized", { status: 401 });
    }
    const products = await db.products.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}