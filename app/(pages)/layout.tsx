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
  TabletSmartphone,
  SquaresIntersectIcon,
  Package2,
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

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
              name: "All Tasks",
              href: "/all-task",
              icon: TabletSmartphone,
            }
            ,
            {
              name: "All Projects",
              href: "/projects",
              icon: FolderOpen,
            },
            // {
            //   name: "My Task",
            //   href: `/projects/user-work/${session?.user?.id}`,
            //   icon: FolderOpen,
            // },
          ],
        },
        {
          name: "Contact",
          href: `/workspaces/${currentWorkspace?.id}/members`,
          icon: Users,
          children: [
            {
              name: "Team",
              href: `/workspaces/${currentWorkspace?.id}/members`,
              icon: Users,
            },
            {
              name: "Clients",
              href: `/workspaces/clients`,
              icon: SquaresIntersectIcon
            },
            // {
            //   name: "Invite Members",
            //   href: `/workspaces/${currentWorkspace?.id}/members`,
            //   icon: PlusCircle,
            // },
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
              name: "Assets",
              href: "/assets",
              icon: TabletSmartphone,
            },
            {
              name: "Our Product",
              href: "/our-product",
              icon: Package2,
            },
            // {
            //   name: "My Task",
            //   href: `/projects/user-work/${session?.user?.id}`,
            //   icon: FolderOpen,
            // },
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
      label: "Analytics",
      items: [
        {
          name: "Analytics",
          href: "/all-user",
          icon: BarChart3,
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


  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
<ProjectContext.Provider
  value={{
    workspaceId: params.workspaceId as string,
    projectId: params.projectId as string,
  }}
>
  <SidebarProvider>
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar with improved laptop sizing */}
      <AppSidebar
        navigationGroups={navigationGroups}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onWorkspaceSwitch={handleSwitchWorkspace}
        onWorkspaceAdd={handleAddWorkspace}
        showWorkspaceSwitcher={true}
        variant="sidebar"
        collapsible="icon"
        className="border-r border-border/40 backdrop-blur-sm z-50"
      />
      
      {/* ENHANCED FIX: Main content container with proper flex and overflow handling */}
      <SidebarInset className="flex-1 flex flex-col min-w-0 max-w-full">
        <MobileHeader  />
        
        {/* Header with laptop-optimized spacing */}
        <div className="relative">
          <Header 
            session={session} 
            className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          />
          
          {/* Improved SidebarTrigger positioning for laptops */}
          <SidebarTrigger className="absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-9 left-[-0.85rem] and z-50" />
        </div>

        {/* ENHANCED FIX: Main content with optimized laptop layout */}
        <main className="flex-1 relative">
          {/* Content wrapper with proper padding and max-width for laptops */}
          <div className="h-full w-full">
            <div className="container mx-auto h-full px-4 py-6 lg:px-8 lg:py-8 max-w-7xl">
              {/* Scrollable content area */}
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