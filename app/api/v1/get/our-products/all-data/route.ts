import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Get API key from environment variables
    const API_KEY = process.env.API_KEY;
    
    // Check if API key is configured
    if (!API_KEY) {
      console.error("[PRODUCTS_GET] API key not configured");
      return new NextResponse("API key not configured", { status: 500 });
    }

    // Extract Authorization header from request
    const authHeader = request.headers.get("Authorization");
    
    // Validate Authorization header format
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("forbiden", { status: 401 });
    }

    // Extract token from header
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Compare token with API key
    if (token !== API_KEY) {
      return new NextResponse("Invalid API key", { status: 401 });
    }

    // If authenticated, proceed with fetching products
    const products = await db.products.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}