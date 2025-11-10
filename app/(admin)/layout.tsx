import { ReactNode } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AppSidebar,
  MobileHeader,
} from "@/components/layout-module/app-sidebar-better";
import { getCurrentUser } from "@/utils/getcurrentUser";
import { Header } from "@/components/layout-module/header";
// import { AppSidebar, NavigationGroup } from "@/components/layout-module/app-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  const navMain = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: "LayoutDashboard",
      items: [
        { title: "Overview", url: "/admin/dashboard", icon: "Home" },
        {
          title: "Reports",
          url: "/admin/dashboard/reports",
          icon: "FileChartColumn",
        },
        {
          title: "Activity Logs",
          url: "/admin/dashboard/activity",
          icon: "ActivitySquare",
        },
      ],
    },
    {
      title: "Projects",
      url: "/admin/projects",
      icon: "FolderKanban",
      items: [
        { title: "All Projects", url: "/admin/projects", icon: "Folder" },
        {
          title: "Create Project",
          url: "/admin/projects/create",
          icon: "FilePlus",
        },
        {
          title: "Archived Projects",
          url: "/admin/projects/archived",
          icon: "Archive",
        },
      ],
    },
    {
      title: "Tasks",
      url: "/admin/tasks",
      icon: "ListChecks",
      items: [
        { title: "All Tasks", url: "/admin/tasks", icon: "ClipboardList" },
        { title: "My Tasks", url: "/admin/tasks/my", icon: "ListTodo" },
        { title: "Team Tasks", url: "/admin/tasks/team", icon: "Users" },
        {
          title: "Create Task",
          url: "/admin/tasks/create",
          icon: "PlusSquare",
        },
      ],
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: "UserCog",
      items: [
        { title: "All Users", url: "/admin/users", icon: "Users" },
        {
          title: "Roles & Permissions",
          url: "/admin/users/roles",
          icon: "ShieldCheck",
        },
        { title: "Add User", url: "/admin/users/create", icon: "UserPlus" },
      ],
    },
    {
      title: "Assets",
      url: "/admin/assets",
      icon: "Box",
      items: [
        { title: "All Assets", url: "/admin/assets", icon: "Package" },
        { title: "Upload Asset", url: "/admin/assets/upload", icon: "Upload" },
        { title: "Categories", url: "/admin/assets/categories", icon: "Tags" },
      ],
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: "BarChart3",
      items: [
        {
          title: "User Analytics",
          url: "/admin/analytics/users",
          icon: "UserCheck",
        },
        {
          title: "Project Analytics",
          url: "/admin/analytics/projects",
          icon: "ChartColumn",
        },
        {
          title: "Traffic",
          url: "/admin/analytics/traffic",
          icon: "LineChart",
        },
      ],
    },

    {
      title: "Contacts",
      url: "/admin/contacts",
      icon: "ContactRound",
      items: [
        { title: "Teams", url: "/admin/contacts/teams", icon: "Users" },
        { title: "Clients", url: "/admin/contacts/clients", icon: "User" },
        {
          title: "Vendors",
          url: "/admin/contacts/vendors",
          icon: "UserCircle2",
        },
      ],
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: "Settings2",
      items: [
        { title: "General", url: "/admin/settings", icon: "Cog" },
        {
          title: "Billing",
          url: "/admin/settings/billing",
          icon: "CreditCard",
        },
        {
          title: "Notifications",
          url: "/admin/settings/notifications",
          icon: "Bell",
        },
        {
          title: "Security",
          url: "/admin/settings/security",
          icon: "ShieldLock",
        },
      ],
    },
  ];

  const data = { navMain };
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar
          user={
            user
              ? {
                  id: user.id,
                  name: user.name || "",
                  email: user.email || "",
                  avatar: user.avatar || null,
                }
              : null
          }
          data={data}
          showWorkspaceSwitcher
          variant="sidebar"
          collapsible="icon"
          className="border-r border-border/40 backdrop-blur-sm"
        />

        <SidebarInset className="flex-1 flex flex-col min-w-0 max-w-full">
          <MobileHeader />
          <div className="sticky top-0 z-50">
            {/* ✅ Pass role to header */}
            <Header user={user} workspaceRole="role" className="" role="user" />
            <SidebarTrigger className="absolute rounded-sm hover:bg-foreground hover:text-background px-0 py-0 bg-foreground text-background top-9 left-[-0.85rem] z-50" />
          </div>

          <main className="flex-1 relative">
            <div className="h-full w-full">
              <div className=" h-full ">
                <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
