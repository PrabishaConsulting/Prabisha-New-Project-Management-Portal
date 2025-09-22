// /app/api/users/client/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db"; // Your Prisma client instance
import { CreateClientSchema } from "@/lib/zod";

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