"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ProjectContext } from "@/context/project-context";
import {
  GalleryVerticalEnd,
} from "lucide-react";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AppSidebar,
  MobileHeader,
  type Workspace,
} from "@/components/layout-module/app-sidebar-better";
import { Header } from "@/components/layout-module/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [role, setRole] = useState<string>("");
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 🧩 Fetch user role securely
   */


  /**
   * 🧩 Fetch workspaces
   */
  useEffect(() => {
    async function fetchWorkspaces() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/workspaces");
        if (!res.ok) throw new Error("Failed to fetch workspaces");
        const data = await res.json();
        setWorkspaces(data.workspaces || []);
        setCurrentWorkspace(
          data.currentWorkspace ||
            (data.workspaces && data.workspaces[0]) ||
            null
        );
      } catch (error) {
        console.error("❌ Error fetching workspaces:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status]);


    useEffect(() => {
    async function fetchRole() {
      if (!session?.user?.id) return; // stop early if no session yet

      try {
        console.log("🔍 Fetching role for user:", session.user.id);
        const res = await fetch(`/api/admin/users/${session.user.id}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch user role: ${text}`);
        }

        const data = await res.json();
        console.log("✅ Role fetched successfully:", data);
        setRole(data.role || "");
      } catch (err) {
        console.error("❌ Error fetching role:", err);
      }
    }

    // only run once authenticated and user id available
    if (status === "authenticated" && session?.user?.id) {
      fetchRole();
    }
  }, [status, session?.user?.id]);

  /**
   * 🕐 Prevent rendering before session or data is ready
   */
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  /**
   * 🧩 Sidebar data (unchanged)
   */
  const teams = workspaces.map((workspace) => ({
    name: workspace.name,
    logo: workspace.logo || GalleryVerticalEnd,
  }));

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: "FolderOpen",
      items: [
        { title: "My Tasks", url: "/all-task" },
        { title: "Team Task", url: "/team-task" },
        { title: "My Projects", url: "/my-projects" },
        { title: "All Projects", url: "/projects" },
      ],
    },
    {
      title: "Contact",
      url: `/workspaces/${currentWorkspace?.id}/members`,
      icon: "Users",
      items: [
        { title: "Team", url: `/workspaces/${currentWorkspace?.id}/members` },
        { title: "Clients", url: `/workspaces/clients` },
      ],
    },
    {
      title: "Assets",
      url: "/assets",
      icon: "Package",
      items: [
        { title: "Assets", url: "/assets" },
        { title: "Our Products", url: "/our-product" },
      ],
    },
    { title: "Workspaces", url: "/workspaces", icon: "Building2" },
    { title: "Analytics", url: "/all-user", icon: "BarChart3"},
    {
      title: "Settings",
      url: `/account/${session?.user?.id}`,
      icon: "Settings",
      items: [
        { title: "My Projects", url: `/account/${session?.user?.id}` },
        { title: "Security", url: `/account/${session?.user?.id}/security` },
      ],
    },
  ];

  const data = { teams, navMain };

  /**
   * 🧩 Render layout
   */
  return (
    <ProjectContext.Provider
      value={{
        workspaceId: params.workspaceId as string,
        projectId: params.projectId as string,
      }}
    >
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar
            user={
              session?.user
                ? {
                    id: session.user.id,
                    name: session.user.name || "",
                    email: session.user.email || "",
                    avatar: session.user.image || null,
                  }
                : null
            }
            data={data}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            showWorkspaceSwitcher
            onWorkspaceSwitch={() => {}}
            variant="sidebar"
            collapsible="icon"
            className="border-r border-border/40 backdrop-blur-sm"
          />

          <SidebarInset className="flex-1 flex flex-col min-w-0 max-w-full">
            <MobileHeader />
            <div className="sticky top-0 z-50">
              {/* ✅ Pass role to header */}
              <Header user={session?.user} workspaceRole="role" className="" role={role} />
              <SidebarTrigger className="absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-9 left-[-0.85rem] z-50" />
            </div>

            <main className="flex-1 relative">
              <div className="h-full w-full">
                <div className="container mx-auto h-full px-4 py-6 lg:px-8 lg:py-8 max-w-7xl">
                  <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {children}
                  </div>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProjectContext.Provider>
  );
}
