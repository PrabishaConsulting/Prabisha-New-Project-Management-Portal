import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { name, email, industry, location } = data;

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Product name is required" },
                { status: 400 }
            );
        }

        // Check for duplicate name
        const existingProduct = await db.internalProduct.findUnique({
            where: { name: name.trim() }
        });

        if (existingProduct) {
            return NextResponse.json(
                { error: "Product name already exists" },
                { status: 409 }
            );
        }

        const newProduct = await db.internalProduct.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                industry: industry?.trim() || null,
                location: location?.trim() || null,
            }
        });

        return NextResponse.json(newProduct, { status: 201 });

    } catch (error) {
        console.error("POST /api/internal-products error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const products = await db.internalProduct.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                industry: true,
                location: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        projects: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(products, { status: 200 });
    } catch (error) {
        console.error("GET /api/internal-products error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const data = await req.json();
        const { id, name, email, industry, location } = data;

        if (!id) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Product name is required" },
                { status: 400 }
            );
        }

        // Check if product exists
        const existingProduct = await db.internalProduct.findUnique({
            where: { id }
        });

        if (!existingProduct) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Check for duplicate name (excluding current product)
        if (name.trim() !== existingProduct.name) {
            const duplicateProduct = await db.internalProduct.findUnique({
                where: { name: name.trim() }
            });

            if (duplicateProduct) {
                return NextResponse.json(
                    { error: "Product name already exists" },
                    { status: 409 }
                );
            }
        }

        const updatedProduct = await db.internalProduct.update({
            where: { id },
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                industry: industry?.trim() || null,
                location: location?.trim() || null,
                updatedAt: new Date()
            }
        });

        return NextResponse.json(updatedProduct, { status: 200 });

    } catch (error) {
        console.error("PATCH /api/internal-products error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 }
            );
        }

        // Check if product exists
        const existingProduct = await db.internalProduct.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        projects: true
                    }
                }
            }
        });

        if (!existingProduct) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        // Check if product has associated projects
        if (existingProduct._count.projects > 0) {
            return NextResponse.json(
                { error: `Cannot delete product "${existingProduct.name}" because it has ${existingProduct._count.projects} associated project(s)` },
                { status: 409 }
            );
        }

        await db.internalProduct.delete({
            where: { id }
        });

        return NextResponse.json(
            { message: "Product deleted successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("DELETE /api/internal-products error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}