"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ProjectContext } from "@/context/project-context";
import {
  Users,
  FolderOpen,
  Settings,
  Package,
  BarChart3,
  TabletSmartphone,
  SquaresIntersectIcon,
  Package2,
  PackageCheckIcon,
  Building2,
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
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
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

useEffect(() => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const setMetaDescription = (content: string) => {
    let meta = document.querySelector("meta[name='description']");
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  };

  const updateTitle = () => {
    const stored = localStorage.getItem("taskTimers");
    const defaultTitle = "Task Manager";
    const defaultDescription = "Manage and track your tasks efficiently.";

    if (!stored) {
      document.title = defaultTitle;
      setMetaDescription(defaultDescription);
      return;
    }

    try {
      const timers = JSON.parse(stored);
      const tasks = Object.values(timers) as any[];
      const now = Date.now();

      const runningTask = tasks.find((t) => t.isRunning);
      const pausedTask = tasks.find((t) => t.isPaused && !t.isRunning);

      if (runningTask) {
        let elapsed = runningTask.totalElapsed;
        if (runningTask.currentSessionStart) {
          elapsed += Math.floor((now - runningTask.currentSessionStart) / 1000);
        }
        const formatted = formatTime(elapsed);
        document.title = `${formatted} — ${runningTask.taskTitle}`;
        setMetaDescription(`Currently running: ${runningTask.taskTitle} (${formatted})`);
      } else if (pausedTask) {
        const formatted = formatTime(pausedTask.totalElapsed);
        document.title = `⏸ Paused — ${pausedTask.taskTitle}`;
        setMetaDescription(`Paused task: ${pausedTask.taskTitle} (Elapsed ${formatted})`);
      } else {
        document.title = defaultTitle;
        setMetaDescription(defaultDescription);
      }
    } catch (err) {
      console.error("Failed to parse timers:", err);
      document.title = "Task Manager";
      setMetaDescription("Manage and track your tasks efficiently.");
    }
  };

  updateTitle();
  const interval = setInterval(updateTitle, 1000);

  // 👇 Listen for localStorage updates (works across tabs or components)
  window.addEventListener("storage", updateTitle);

  return () => {
    clearInterval(interval);
    window.removeEventListener("storage", updateTitle);
    document.title = "Task Manager";
    setMetaDescription("Manage and track your tasks efficiently.");
  };
}, []);



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

  // Transform workspaces to teams format
  const teams = workspaces.map(workspace => ({
    name: workspace.name,
    logo: workspace.logo || GalleryVerticalEnd,
    // plan: workspace.plan || "Free"
  }));

  // Transform navigation groups to navMain format
  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: FolderOpen,
      items: [
        {
          title: "All Tasks",
          url: "/all-task",
        },
        {
          title: "My Projects",
          url: "/my-projects",
        },
        {
          title: "All Projects",
          url: "/projects",
        },
      ],
    },
    {
      title: "Contact",
      url: `/workspaces/${currentWorkspace?.id}/members`,
      icon: Users,
      items: [
        {
          title: "Team",
          url: `/workspaces/${currentWorkspace?.id}/members`,
        },
        {
          title: "Clients",
          url: `/workspaces/clients`,
        },
      ],
    },
    {
      title: "Assets",
      url: "/assets",
      icon: Package,
      items: [
        {
          title: "Assets",
          url: "/assets",
        },
        {
          title: "Our Products",
          url: "/our-product",
        },
      ],
    },
    {
      title: "Workspaces",
      url: "/workspaces",
      icon: Building2,
    },
    {
      title: "Analytics",
      url: "/all-user",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: `/account/${session?.user?.id}`,
      icon: Settings,
      items: [
        {
          title: "My Projects",
          url: `/account/${session?.user?.id}`,
        },
        {
          title: "Security",
          url: `/account/${session?.user?.id}/security`,
        },
      ],
    },
  ];

  // Combine into the data object
  const data = {
    teams,
    navMain
  };

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
            user={session?.user ? { 
              id: session.user.id, 
              name: session.user.name || "", 
              email: session.user.email || "", 
              avatar: session.user.avatar || null,
            } : null}
            data={data}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            onWorkspaceSwitch={handleSwitchWorkspace}
            onWorkspaceAdd={handleAddWorkspace}
            showWorkspaceSwitcher={true}
            variant="sidebar"
            collapsible="icon"
            className="border-r border-border/40 backdrop-blur-sm "
          />
          {/* ENHANCED FIX: Main content container with proper flex and overflow handling */}
          <SidebarInset className="flex-1 flex flex-col min-w-0 max-w-full">
            {/* Mobile Header */}
            <MobileHeader />

            {/* Header with laptop-optimized spacing */}
            <div className="sticky top-0 z-50">
              <Header session={session} className="" />

              {/* Improved SidebarTrigger positioning for laptops */}
              <SidebarTrigger className="absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-9 left-[-0.85rem] z-50" />
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