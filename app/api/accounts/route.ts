// app/api/accounts/route.ts

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { UserType } from "@/app/generated/client";
import { hasUserRole } from "@/services/role-services/has-user-role.service";
import { getCurrentUser } from "@/utils/getcurrentUser";

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
        return NextResponse.json({ error: "not logdin" }, { status: 403 })
    }
    const checkadmin = await hasUserRole(currentUser.id, 'ADMIN')
    if (!checkadmin){
        return NextResponse.json({ error: "unauthrosied" }, { status: 403 })
    }
    const data = await req.json();
    const { id, type, ...updateData } = data;

    if (!id || !type) {
      return NextResponse.json(
        { error: "Record ID and type are required" },
        { status: 400 }
      );
    }

    let updatedRecord;

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
    } else if (type === 'INTERNAL_PRODUCT') {
      updatedRecord = await db.internalProduct.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          industry: updateData.industry,
          location: updateData.location,
        },
      });
    } else {
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