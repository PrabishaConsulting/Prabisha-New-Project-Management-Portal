// app/api/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllCategories } from "@/actions/categories";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get parameters from searchParams
    const page = Number(searchParams.get("page")) || 1;
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = Number(searchParams.get("limit")) || 10;

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (category) {
      whereClause.categories = {
        some: {
          id: category
        }
      };
    }
    

    // Build order clause
    const orderClause: any = {};
    orderClause[sortBy] = sortOrder;

    // Fetch data in parallel
    const [products, totalProducts, categories] = await Promise.all([
      db.products.findMany({
        orderBy: orderClause,
        take: limit,
        skip: (page - 1) * limit,
        include: {
          categories: true
        },
        where: whereClause
      }),
      db.products.count({
        where: whereClause
      }),
      getAllCategories()
    ]);

    const pageCount = Math.ceil(totalProducts / limit);
    
    return NextResponse.json({
      data: products,
      pageCount,
      totalProducts,
      categories
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}