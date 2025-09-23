import { db } from "@/lib/db";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { NextResponse } from "next/server";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one product ID is required."),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const body = await req.json();
    const { ids } = bulkDeleteSchema.parse(body);

    await db.products.deleteMany({
      where: { id: { in: ids } },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    console.error("[PRODUCTS_BULK_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}