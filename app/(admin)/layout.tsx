import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
// import { AppSidebar, NavigationGroup } from "@/components/layout-module/app-sidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");

  // Enforce admin-only access
  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!me || me.role !== "ADMIN") redirect("/projects");

  // const navigationGroups: NavigationGroup[] = [
  //   {
  //     label: "Administration",
  //     items: [
  //       { name: "Overview", href: "/admin", icon: null },
  //       { name: "Users", href: "/admin", icon: null },
  //       { name: "Projects", href: "/admin", icon: null },
  //     ],
  //   },
  // ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
      {/* <AppSidebar siteName={  "Admin"} logoUrl={ "/prabisha-assets/logo.png"} /> */}
        <div className="flex-1 flex flex-col ">
          {/* Header using client wrapper to read session */}
          {/* <AdminHeaderClient /> */}
          <main className="p-4 md:p-6 flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}