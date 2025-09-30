import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// import { logAudit } from "@/lib/audit";

const GroupCreateSchema = z.object({
  title: z.string().min(1),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
});

const GroupUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string()).optional(),
});

// Helper function to check authorization
async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null; // No error
}

export async function GET() {
  try {
    const groups = await db.sidebarGroup.findMany({
      include: {
        items: {
          select: {
            id: true,
            label: true,
            href: true,
            icon: true,
            position: true,
            isActive: true,
            roleAccess: {
              select: {
                roleId: true,
                hasAccess: true,
                role: { select: { id: true, name: true } }
              }
            }
          }
        },
        roleAccess: {
          select: {
            roleId: true,
            hasAccess: true,
            role: { 
              select: { 
                id: true, 
                name: true 
              } 
            }
          }
        }
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

    return NextResponse.json({ data: shaped });
  } catch (error) {
    console.error("GET /api/sidebar/groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" }, 
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authorization first
    const authError = await checkAuth();
    if (authError) return authError;

    const body = await req.json();
    const { title, position, isActive, roleIds } = GroupCreateSchema.parse(body);

    const created = await db.sidebarGroup.create({
      data: { 
        title, 
        position: position ?? 0, 
        isActive: isActive ?? true,
        roleAccess: {
          create: roleIds?.map(roleId => ({ roleId, hasAccess: true })) || [],
        },
      },
    });

    // Audit logging with error handling
    // try {
    //   await logAudit({ 
    //     action: "SIDEBAR_GROUP_CREATED", 
    //     resource: "/api/site-settings/sidebar/groups", 
    //     metadata: { id: created.id, title, roleIds } 
    //   });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/sidebar/groups error:", error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues?.[0]?.message ?? "Invalid input data" }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create group" }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check authorization first
    const authError = await checkAuth();
    if (authError) return authError;

    const body = await req.json();
    const { id, roleIds, ...data } = GroupUpdateSchema.parse(body);

    await db.$transaction(async (tx) => {
      const updatedGroup = await tx.sidebarGroup.update({
        where: { id },
        data: { ...data },
      });

      if (roleIds !== undefined) {
        await tx.sidebarGroupAccess.deleteMany({
          where: { sidebarGroupId: id },
        });
        if (roleIds.length > 0) {
          await tx.sidebarGroupAccess.createMany({
            data: roleIds.map((roleId) => ({
              sidebarGroupId: id,
              roleId,
              hasAccess: true,
            })),
          });
        }
      }
      return updatedGroup;
    });

    const updated = await db.sidebarGroup.findUnique({
      where: { id },
      include: {
        roleAccess: {
          select: {
            roleId: true,
            hasAccess: true,
            role: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Audit logging
    // try {
    //   await logAudit({ 
    //     action: "SIDEBAR_GROUP_UPDATED", 
    //     resource: "/api/site-settings/sidebar/groups", 
    //     metadata: { id, data, roleIds } 
    //   });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    console.error("PUT /api/sidebar/groups error:", error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues?.[0]?.message ?? "Invalid input data" }, 
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') { // db record not found
      return NextResponse.json(
        { error: "Group not found" }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update group" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check authorization first
    const authError = await checkAuth();
    if (authError) return authError;

    const body = await req.json();
    const { id } = z.object({ id: z.string().min(1) }).parse(body);

    const deleted = await db.sidebarGroup.delete({
      where: { id },
    });

    // // Audit logging
    // try {
    //   await logAudit({ 
    //     action: "SIDEBAR_GROUP_DELETED", 
    //     resource: "/api/site-settings/sidebar/groups", 
    //     metadata: { id: deleted.id, title: deleted.title } 
    //   });
    // } catch (auditError) {
    //   console.warn("Audit logging failed:", auditError);
    // }

    return NextResponse.json({ data: deleted });
  } catch (error: any) {
    console.error("DELETE /api/sidebar/groups error:", error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues?.[0]?.message ?? "Invalid input data" }, 
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') { // db record not found
      return NextResponse.json(
        { error: "Group not found" }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete group" }, 
      { status: 500 }
    );
  }
}