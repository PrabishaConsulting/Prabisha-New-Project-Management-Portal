"use client";

import {
  ChevronRight,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import Link from "next/link";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    badge?: string;
    items?: {
      title: string;
      url: string;
      icon?: LucideIcon;
      badge?: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Automatically open groups with active children
  useEffect(() => {
    const newOpenGroups = new Set<string>();
    
    items.forEach(item => {
      const hasActiveChild = item.items?.some(child => child.url === pathname);
      const isParentActive = item.url === pathname;
      
      if (hasActiveChild || isParentActive) {
        newOpenGroups.add(item.title);
      }
    });
    
    setOpenGroups(newOpenGroups);
  }, [pathname, items]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const isActiveLink = (url: string, children?: { url: string }[]) => {
    return pathname === url || children?.some(child => child.url === pathname);
  };

  return (
    <SidebarGroup>

      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = item.items && item.items.length > 0;
          const isParentActive = isActiveLink(item.url, item.items);

          // --- COLLAPSED STATE LOGIC ---
          if (state === "collapsed") {
            if (hasChildren) {
              // RENDER POPOVER FOR ITEMS WITH CHILDREN
              return (
                <Popover key={item.title}>
                  <PopoverTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isParentActive}
                        className={clsx(
                          "transition-colors",
                          isParentActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span className="sr-only">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </PopoverTrigger>
                  <PopoverContent
                    side="right"
                    align="start"
                    className="p-1 w-48"
                  >
                    <div className="flex flex-col space-y-1">
                      <p className="px-3 py-2 text-sm font-semibold">
                        {item.title}
                      </p>
                      {item.items?.map((child) => {
                        const isSubActive = pathname === child.url;
                        return (
                          <Link
                            key={child.title}
                            href={child.url}
                            className={clsx(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                              isSubActive
                                ? "text-primary font-medium underline bg-accent"
                                : "hover:text-foreground/80"
                            )}
                          >
                            {child.icon && (
                              <child.icon className="h-4 w-4" />
                            )}
                            <span>{child.title}</span>
                            {child.badge && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {child.badge}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            } else {
              // RENDER TOOLTIP FOR ITEMS WITHOUT CHILDREN
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        className={clsx(
                          "transition-colors",
                          pathname === item.url
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                      >
                        <Link href={item.url}>
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span className="sr-only">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
          }

          // --- EXPANDED STATE LOGIC ---
          return (
            <SidebarMenuItem key={item.title}>
              {hasChildren ? (
                <Collapsible
                  open={openGroups.has(item.title)}
                  onOpenChange={() => toggleGroup(item.title)}
                >
                  <div className="flex items-center">
                    <SidebarMenuButton
                      asChild
                      isActive={isParentActive}
                      className={clsx(
                        "transition-colors",
                        isParentActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-primary"
                      )}
                    >
                      <Link
                        href={item.url}
                        className="flex items-center gap-2 w-full"
                      >
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs h-5">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleGroup(item.title);
                        }}
                      >
                        {openGroups.has(item.title) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((child) => {
                        const isSubActive = pathname === child.url;
                        return (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className={clsx(
                                "transition-colors",
                                isSubActive
                                  ? "text-primary font-medium underline bg-accent"
                                  : "hover:text-foreground/80"
                              )}
                            >
                              <Link
                                href={child.url}
                                className="flex items-center gap-2 w-full"
                              >
                                {child.icon && (
                                  <child.icon className="h-4 w-4" />
                                )}
                                <span className="flex-1">{child.title}</span>
                                {child.badge && (
                                  <Badge variant="secondary" className="text-xs h-4">
                                    {child.badge}
                                  </Badge>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  className={clsx(
                    "transition-colors",
                    pathname === item.url
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Link
                    href={item.url}
                    className="flex items-center gap-2 w-full"
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs h-5">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}