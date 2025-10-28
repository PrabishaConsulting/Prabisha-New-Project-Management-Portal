import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      console.error("[PRODUCTS_GET] API key not configured");
      return new NextResponse("API key not configured", { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Forbidden", { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== API_KEY) {
      return new NextResponse("Invalid API key", { status: 401 });
    }

    // ✅ Extract query params
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const statusParam = searchParams.get("status");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    // ✅ Build dynamic filter
    const where: any = {};

    // Filter by category (many-to-many)
    if (categoryParam) {
      const categoryNames = categoryParam.split(",").map((c) => c.trim());
      where.categories = {
        some: {
          name: { in: categoryNames },
        },
      };
    }

    // Filter by product status
    if (statusParam) {
      where.status = statusParam.toUpperCase();
    }

    // ✅ Pagination
    const page = Math.max(pageParam, 1);
    const limit = Math.min(Math.max(limitParam, 1), 100); // limit max 100 items
    const skip = (page - 1) * limit;

    // ✅ Count total items (for pagination)
    const totalCount = await db.products.count({ where });

    // ✅ Fetch paginated + filtered products
    const products = await db.products.findMany({
      where,
      include: {
        categories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // ✅ Prepare metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: products,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
