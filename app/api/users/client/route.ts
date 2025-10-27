// /app/api/users/client/route.ts

import { NextResponse , NextRequest} from "next/server";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db"; // Your Prisma client instance
import { CreateClientSchema } from "@/lib/zod";
import { UserType } from "@/app/generated/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate the incoming data against your Zod schema
    const validatedData = CreateClientSchema.safeParse(body);

    if (!validatedData.success) {
      return new NextResponse("Invalid input data.", { status: 400 });
    }

    const { name, email, password } = validatedData.data;

    // 2. Check if a user with this email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse("A user with this email already exists.", { status: 409 });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the new user in the database
    const newUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        userType: "CLIENT", // Set the user type as defined in the form logic
        role: "MEMBER",      // Default role from your schema
      },
    });

    // 5. Return the newly created user (without the password)
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("[CLIENT_USER_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


// app/api/accounts/route.ts


export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, type, ...updateData } = data; // Destructure type and the rest of the data

    if (!id || !type) {
      return NextResponse.json(
        { error: "Record ID and type are required" },
        { status: 400 }
      );
    }

    let updatedRecord;

    // Logic to update a 'real' user
    if (type === UserType.CLIENT) {
      updatedRecord = await db.user.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          industry: updateData.industry,
          location: updateData.location,
        },
      });
    } 
    // Logic to update an 'internal' product
    else if (type === 'INTERNAL_PRODUCT') { 
      // Note: Comparing against a string if InternalProduct is not in your enum
      updatedRecord = await db.internalProduct.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          industry: updateData.industry,
          location: updateData.location,
        },
      });
    } 
    // Handle invalid type
    else {
      return NextResponse.json({ error: "Invalid record type" }, { status: 400 });
    }

    return NextResponse.json(updatedRecord, { status: 200 });

  } catch (error) {
    console.error("PATCH /api/accounts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}