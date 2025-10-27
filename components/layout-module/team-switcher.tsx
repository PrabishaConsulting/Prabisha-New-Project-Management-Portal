"use client";

import * as React from "react";
import { Stethoscope } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
  currentTeam,
  onTeamSwitch,
  onTeamAdd,
}: {
  teams: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
  currentTeam?: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan: string;
  };
  onTeamSwitch?: (teamId: string) => void;
  onTeamAdd?: (name: string) => Promise<void>;
}) {
  const { state } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(currentTeam || teams[0]);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "My Project";

  // Update active team when currentTeam prop changes
  React.useEffect(() => {
    if (currentTeam) {
      setActiveTeam(currentTeam);
    }
  }, [currentTeam]);

  return (
    <SidebarMenu className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
      <SidebarMenuItem>
          {state === "collapsed" ? (
            // --- COLLAPSED VIEW (WITH TOOLTIP) ---
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-3">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={30}
                    height={30}
                    unoptimized
                    className="rounded-md flex-shrink-0"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{appName}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            // --- EXPANDED VIEW ---
            <div className="px-3 py-3 flex flex-col items-center text-center">
              <div className="flex flex-col items-center">
                <Image
                  src="/prabisha-assets/logo.png"
                  alt="Logo"
                  width={200}
                  height={50}
                  unoptimized
                  className="rounded-md flex-shrink-0 bg-white"
                />
                <h1 className="text-lg font-semibold truncate mt-2">
                  {appName}
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Powered by{" "}
                <span className="font-medium">
                  <a
                    className="text-secondary"
                    href="https://prabisha.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Prabisha Consulting
                  </a>
                </span>
              </p>
            </div>
          )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
