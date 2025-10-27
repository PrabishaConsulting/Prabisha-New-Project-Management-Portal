import { db } from "@/lib/db";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductStatus } from "@/app/generated/client";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  status: z.nativeEnum(ProductStatus),
  url: z.string().url("Must be a valid URL"),
  icon: z.string().max(255).nullable().optional(),
  image: z.string().max(255).nullable().optional(),
  categories: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const body = await req.json();
    const validatedData = productSchema.parse(body);

    const { categories, ...productData } = validatedData;

    const product = await db.products.create({
      data: {
        ...productData,
        categories: categories && categories.length > 0
          ? {
              connect: categories.map(id => ({ id }))
            }
          : undefined
      },
      include: {
        categories: true
      }
    });

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
    if (!user) {
       return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const products = await db.products.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        categories: true
      }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}