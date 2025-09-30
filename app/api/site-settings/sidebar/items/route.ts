import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import { logAudit } from "@/lib/audit";

const ItemCreateSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  sidebarGroupId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
});

const ItemUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  href: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  position: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sidebarGroupId: z.string().min(1).optional(),
  roleIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sidebarGroupId = searchParams.get("sidebarGroupId") || undefined;

    const items = await db.sidebarItem.findMany({
      where: { sidebarGroupId },
      include: {
        sidebarGroup: true,
        roleAccess: {
          select: {
            roleId: true,
            hasAccess: true,
            role: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { position: "asc" },
    });

    const shaped = items.map((item) => ({
      ...item,
      roleAccess: (item.roleAccess || []).map((ra) => ({
        roleId: ra.roleId,
                    hasAccess: ra.hasAccess,
        role: ra.role?.name || ra.roleId,
      })),
    }));

    return NextResponse.json({ data: shaped });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // if (!["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await req.json();
    const { roleIds, ...payload } = ItemCreateSchema.parse(body);

    const created = await db.sidebarItem.create({
      data: {
        ...payload,
        icon: payload.icon ?? null,
        position: payload.position ?? 0,
        isActive: payload.isActive ?? true,
       
       roleAccess: {
          create: roleIds?.map(roleId => ({ roleId, hasAccess: true })) || [],
        },
      },
      include: { roleAccess: true },
    });

    // try {
    //   await logAudit({
    //     action: "SIDEBAR_ITEM_CREATED",
    //     resource: "/api/site-settings/sidebar/items",
    //     metadata: {
    //       id: created.id,
    //       label: created.label,
    //       href: created.href,
    //       roleIds,
    //     },
    //   });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const msg = e?.issues?.[0]?.message ?? "Failed to create item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // if (!["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await req.json();
    const { id, roleIds, ...rest } = ItemUpdateSchema.parse(body);

    await db.$transaction(async (tx) => {
      const updatedItem = await tx.sidebarItem.update({
        where: { id },
        data: rest,
      });

      if (roleIds !== undefined) {
        await tx.sidebarItemAccess.deleteMany({
          where: { sidebarItemId: id },
        });
        if (roleIds.length > 0) {
          await tx.sidebarItemAccess.createMany({
            data: roleIds.map((roleId) => ({
              sidebarItemId: id,
              roleId,
              hasAccess: true,
            })),
          });
        }
      }
      return updatedItem;
    });

    const fresh = await db.sidebarItem.findUnique({
      where: { id },
      include: { roleAccess: true },
    });

    // try {
    //   await logAudit({ action: "SIDEBAR_ITEM_UPDATED", resource: "/api/site-settings/sidebar/items", metadata: { id, data: rest, roleIds } });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: fresh });
  } catch (e: any) {
    console.error(e);
    const msg = e?.issues?.[0]?.message ?? "Failed to update item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // if (!["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { id } = z.object({ id: z.string().min(1) }).parse(await req.json());

    const deleted = await db.sidebarItem.delete({ where: { id } });

    // try {
    //   await logAudit({ action: "SIDEBAR_ITEM_DELETED", resource: "/api/site-settings/sidebar/items", metadata: { id: deleted.id, label: deleted.label, href: deleted.href } });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: deleted });
  } catch (e: any) {
    console.error(e);
    const msg = e?.issues?.[0]?.message ?? "Failed to delete item";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}