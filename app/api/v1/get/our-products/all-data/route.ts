import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
      console.error("[PRODUCTS_GET] API key not configured");
      return NextResponse.json("API key not configured", { status: 500 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json("Forbidden", { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== API_KEY) {
      return NextResponse.json("Invalid API key", { status: 401 });
    }

    // ✅ Extract query params
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const statusParam = searchParams.get("status");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);

    // ✅ Build dynamic filter
    const where: any = {};

    // Filter by category - SPACE-INSENSITIVE MATCHING
    if (categoryParam) {
      const categoryNames = categoryParam
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (categoryNames.length > 0) {
        // Fetch ALL categories first, then filter in memory
        const allCategories = await db.categories.findMany({
          select: { id: true, name: true },
        });

        // Normalize and match
        const matchedCategoryIds = allCategories
          .filter((cat) => {
            const normalizedDbName = cat.name.replace(/\s+/g, "").toLowerCase();
            return categoryNames.some((inputCat) => {
              const normalizedInput = inputCat.replace(/\s+/g, "").toLowerCase();
              return normalizedDbName === normalizedInput;
            });
          })
          .map((cat) => cat.id);

        if (matchedCategoryIds.length > 0) {
          where.categories = {
            some: {
              id: { in: matchedCategoryIds },
            },
          };
        } else {
          // No matches found, return empty result
          where.id = { equals: -1 }; // Force no results
        }
      }
    }

    // Filter by product status - Convert to uppercase for enum matching
    if (statusParam) {
      where.status = statusParam.toUpperCase();
    }

    // ✅ Pagination
    const page = Math.max(pageParam, 1);
    const limit = Math.min(Math.max(limitParam, 1), 100);
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
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}