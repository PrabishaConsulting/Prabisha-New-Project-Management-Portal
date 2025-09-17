"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { ProjectContext } from '@/context/project-context';
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  Package,
  BarChart3,
  FileText,
  Home,
  Building2,
  PlusCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, MobileHeader, type NavigationGroup, type Workspace } from "@/components/layout-module/app-sidebar";
import { Header } from "@/components/layout-module/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();

  // State for workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch workspaces on component mount
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
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    if (status === "authenticated") {
      fetchWorkspaces();
    }
  }, [status]);

  // Handler to switch workspace
  const handleSwitchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      try {
        await fetch("/api/user/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });
        router.refresh();
      } catch (error) {
        console.error("Failed to switch workspace:", error);
      }
    }
  };

  // Handler for adding a new workspace
  const handleAddWorkspace = async (name: string) => {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const data = await res.json();
      setWorkspaces((prev) => [...prev, data.workspace]);
      setCurrentWorkspace(data.workspace);
      router.refresh();
    } else {
      throw new Error("Failed to add workspace");
    }
  };

  // If session is loading, show a loader
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show sign-in prompt


  // Define navigation groups with proper structure
  const navigationGroups: NavigationGroup[] = [
    
    {
      label: "Workspace",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: FolderOpen,
          children: [
            {
              name: "All Projects",
              href: "/projects",
              icon: FolderOpen,
            },
            {
              name: "My Task",
              href: `/projects/user-work/${session?.user?.id}`,
              icon: FolderOpen,
            },
          ],
        },
        {
          name: "Team",
          href: `/workspaces/${currentWorkspace?.id}/members`,
          icon: Users,
          children: [
            {
              name: "All Members",
              href: `/workspaces/${currentWorkspace?.id}/members`,
              icon: Users,
            },
            {
              name: "Invite Members",
              href: `/workspaces/${currentWorkspace?.id}/members`,
              icon: PlusCircle,
            },
          ],
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          name: "Assets",
          href: "/assets",
          icon: Package,
          children: [
            {
              name: "All Assets",
              href: "/assets",
              icon: Package,
            },
          ],
        },
        {
          name: "Workspaces",
          href: "/workspaces",
          icon: Building2,
        },
      ],
    },
    {
      label: "Account",
      items: [
        {
          name: "Settings",
          href: `/account/${session?.user?.id}`,
          icon: Settings,
          children: [
            {
              name: "My Projects",
              href: `/account/${session?.user?.id}/`,
              icon: Settings,
            },
            {
              name: "Security",
              href: `/account/${session?.user?.id}/security`,
              icon: Settings,
            },
          ],
        },
      ],
    },
  ];

  return (
    <ProjectContext.Provider
      value={{
        workspaceId: params.workspaceId as string,
        projectId: params.projectId as string,
      }}
    >
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
  
          {/* Sidebar */}
          <AppSidebar
            navigationGroups={navigationGroups}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onWorkspaceSwitch={handleSwitchWorkspace}
            onWorkspaceAdd={handleAddWorkspace}
            showWorkspaceSwitcher={true}
            variant="sidebar"
            collapsible="icon"
          />
          
          <SidebarInset className="flex-1 flex flex-col">
            {/* Mobile Header with SidebarTrigger */}
            <MobileHeader />
            <Header session={session}/>
            {/* <button  className="absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-5 left-[-0.9rem] and z-50" > */}
              <SidebarTrigger className=" absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-5 left-[-0.9rem] and z-50"  />

            {/* </button> */}

            {/* Page Content */}
            <main className="flex-1 p-4 lg:p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProjectContext.Provider>
  );
}