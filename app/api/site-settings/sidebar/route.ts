import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role") || undefined;

    const roleSchema = z.enum(["SUPERADMIN", "ADMIN", "USER"]).optional();
    const role = roleSchema.parse(roleParam);

    const groups = await db.sidebarGroup.findMany({
      where: role
        ? {
            roleAccess: {
              some: {
                hasAccess: true,
                role: { name: role },
              },
            },
          }
        : undefined,
      include: { // ALWAYS INCLUDE ROLE ACCESS HERE
        roleAccess: {
          select: {
            roleId: true,
            hasAccess: true,
            role: { select: { id: true, name: true } }
          }
        },
        items: {
          where: role
            ? {
                roleAccess: {
                  some: {
                    hasAccess: true,
                    role: { name: role },
                  },
                },
              }
            : undefined,
          include: { // ALWAYS INCLUDE ROLE ACCESS HERE FOR ITEMS
            roleAccess: {
              select: {
                roleId: true,
                hasAccess: true,
                role: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    // Map roleAccess to include role name directly for the client
    const shaped = groups.map((g) => ({
      ...g,
      roleAccess: (g.roleAccess || []).map((ra) => ({
        roleId: ra.roleId,
        hasAccess: ra.hasAccess,
        role: ra.role?.name || ra.roleId,
      })),
      items: g.items.map((item) => ({
        ...item,
        roleAccess: (item.roleAccess || []).map((ra) => ({
          roleId: ra.roleId,
          hasAccess: ra.hasAccess,
          role: ra.role?.name || ra.roleId,
        })),
      })),
    }));

    const filtered = shaped; // Always return all shaped groups, let frontend handle empty groups if needed

    return NextResponse.json({ data: filtered });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch sidebar" }, { status: 500 });
  }
}
