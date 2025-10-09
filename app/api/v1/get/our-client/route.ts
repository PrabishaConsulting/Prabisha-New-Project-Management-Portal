import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Define enum values for validation
const USER_TYPES = [ 'CLIENT'] as const;
const API_KEY = process.env.API_KEY; // Store in .env file

export async function GET(req: NextRequest) {
  try {
    // 1. Security: Zero Trust Policy - API Key Validation
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      );
    }

    // 2. Parse and validate search parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type')?.toLowerCase();
    const userType = searchParams.get('userType')?.toUpperCase();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate pagination parameters
    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // 3. Handle different data types
    if (type === 'user') {
      // Validate userType parameter
      if (userType && !USER_TYPES.includes(userType as any)) {
        return NextResponse.json(
          { error: 'Invalid userType parameter' },
          { status: 400 }
        );
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Query users with filters and pagination
      const users = await db.user.findMany({
        where: userType ? { userType: userType as any } : {},
        skip,
        take: limit,
        select: {
          id: true,
          userCode: true,
          email: true,
          name: true,
          userType: true,
          industry: true,
          location: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      // Get total count for pagination metadata
      const totalCount = await db.user.count({
        where: userType ? { userType: userType as any } : {}
      });

      return NextResponse.json({
        data: users,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    else if (type === 'internalproduct') {
      // Calculate pagination
      const skip = (page - 1) * limit;

      // Query internal products with pagination
      const products = await db.internalProduct.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      // Get total count for pagination metadata
      const totalCount = await db.internalProduct.count();

      return NextResponse.json({
        data: products,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }

    else {
      return NextResponse.json(
        { error: 'Invalid type parameter. Use "user" or "product"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}