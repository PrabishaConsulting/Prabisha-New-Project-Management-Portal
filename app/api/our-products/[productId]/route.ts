import { db } from "@/lib/db";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductStatus } from "@prisma/client";

const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  url: z.string().url("Must be a valid URL").min(1, "URL is required"),
  status: z.nativeEnum(ProductStatus),
});


export async function PATCH(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const body = await req.json();
    const validatedData = productSchema.parse(body);

    const id = await params;

    if (!id.productId ) {
      return new NextResponse("Product ID is required", { status: 400 });
    }

    const product = await db.products.update({
      where: { id: id.productId },
      data: validatedData,
    });
    return NextResponse.json(product);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    console.error("[PRODUCT_PATCH]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

     const id = await params;

    if (!id.productId ) {
      return new NextResponse("Product ID is required", { status: 400 });
    }
    
    await db.products.delete({ where: { id: id.productId } });
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}