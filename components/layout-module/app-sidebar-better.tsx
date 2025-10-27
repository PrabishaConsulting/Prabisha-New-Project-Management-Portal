"use client";

import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Types
export type NavigationItem = {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  isActive?: boolean;
  items?: Array<{
    title: string;
    url: string;
    isActive?: boolean;
  }>;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export type Workspace = {
  id: string;
  name: string;
  logo?: React.ComponentType<{ className?: string }>;
  plan?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User | null;
  data: any;
  workspaces?: Workspace[];
  currentWorkspace?: Workspace | null;
  onWorkspaceSwitch?: (workspaceId: string) => void;
  onWorkspaceAdd?: (name: string) => Promise<void>;
  showWorkspaceSwitcher?: boolean;
}

export function AppSidebar({
  user,
  data,
  workspaces = [],
  currentWorkspace,
  onWorkspaceSwitch,
  onWorkspaceAdd,
  showWorkspaceSwitcher = true,
  ...props
}: AppSidebarProps) {
  // Transform workspaces to teams format for TeamSwitcher


  // Transform navigation groups to flat array for NavMain

  return (
     <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="">
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// Mobile Header Component
export function MobileHeader() {
  return (
    <div className="flex h-14 items-center border-b px-4 lg:hidden">
      <div className="flex items-center gap-2">
        <GalleryVerticalEnd className="h-6 w-6" />
        <span className="font-semibold">Medical Portal</span>
      </div>
    </div>
  );
}