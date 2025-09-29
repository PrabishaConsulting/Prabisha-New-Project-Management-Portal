"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LogOut,
  ChevronsUpDown,
  ChevronRight,
  ChevronDown,
  
} from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import Image from "next/image";

// Types
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }> | null;
  badge?: string | number;
  children?: NavigationItem[];
  isActive?: boolean;
}

export interface NavigationGroup {
  label?: string;
  items: NavigationItem[];
}

export interface Workspace {
  id: string;
  name: string;
  slug?: string;
  avatar?: string;
}

export interface AppSidebarProps {
  // Navigation
  navigationGroups: NavigationGroup[];

  // Workspace management
  workspaces?: Workspace[];
  currentWorkspace?: Workspace | null;
  onWorkspaceSwitch?: (workspaceId: string) => Promise<void>;
  onWorkspaceAdd?: (name: string) => Promise<void>;
  showWorkspaceSwitcher?: boolean;

  // Customization
  className?: string;
  variant?: "sidebar" | "floating" | "inset";
  side?: "left" | "right";
  collapsible?: "offcanvas" | "icon" | "none";
}

// Helper function
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export function AppSidebar({
  navigationGroups,

  className,
  variant = "sidebar",
  side = "left",
  collapsible = "icon",
}: AppSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  // Get the sidebar state from context
  const { state } = useSidebar();

  // Local state
  // const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  // const [newWorkspaceName, setNewWorkspaceName] = useState("");
  // const [isSubmitting, setIsSubmitting] = useState(false);
  // const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Handle workspace switching
  // const handleSwitchWorkspace = async (workspaceId: string) => {
  //   const workspace = workspaces.find((w) => w.id === workspaceId);
  //   if (workspace && onWorkspaceSwitch) {
  //     await onWorkspaceSwitch(workspaceId);
  //     setIsSwitcherOpen(false);
  //   }
  // };

  // Handle adding new workspace

  // Check if path is active or has active children
  const isActiveLink = (href: string, children?: NavigationItem[]) => {
    // Direct match
    if (pathname === href) return true;

    // Check if any children are active
    if (children) {
      return children.some(
        (child) =>
          pathname === child.href ||
          (child.children &&
            child.children.some((grandchild) => pathname === grandchild.href))
      );
    }

    // Partial match for parent routes
    return pathname.startsWith(href + "/");
  };

  // Toggle group open state
  const toggleGroup = (groupName: string) => {
    const newOpenGroups = new Set(openGroups);
    if (newOpenGroups.has(groupName)) {
      newOpenGroups.delete(groupName);
    } else {
      newOpenGroups.add(groupName);
    }
    setOpenGroups(newOpenGroups);
  };

  // Auto-expand active groups
  useEffect(() => {
    const newOpenGroups = new Set<string>();

    navigationGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && isActiveLink(item.href, item.children)) {
          newOpenGroups.add(item.name);
        }
      });
    });

    setOpenGroups((prev) => new Set([...prev, ...newOpenGroups]));
  }, [pathname, navigationGroups]);

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <Sidebar
          variant={variant}
          side={side}
          collapsible={collapsible}
          // Use the state from the useSidebar hook to control the width
          className={cn(
            "border-r",
            state === "collapsed" ? "w-32" : "w-[16.5rem]", // Increased both sizes
            className
          )}
        >
          {/* === SIDEBAR HEADER === */}
          {/* <SidebarHeader className="border-b">
          {showWorkspaceSwitcher && (
            <div className="px-3 py-2">
              {state === "collapsed" ? (
                // --- COLLAPSED HEADER ---
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10">
                      {currentWorkspace?.avatar ? (
                        <Avatar className="h-5 w-5">
                          <AvatarImage className='object-cover' src={currentWorkspace.avatar} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(currentWorkspace.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {currentWorkspace?.name || "Select workspace"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                // --- EXPANDED HEADER (Original Code) ---
                <Popover open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isSwitcherOpen}
                      className="w-full justify-between h-10"
                      size="sm"
                    >
                      {currentWorkspace ? (
                        <div className="flex items-center space-x-2 min-w-0">
                          {currentWorkspace.avatar && (
                            <Avatar className="h-5 w-5">
                              <AvatarImage className='object-cover' src={currentWorkspace.avatar} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(currentWorkspace.name)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span className="truncate text-sm">
                            {currentWorkspace.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm">Select workspace...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search workspace..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No workspace found.</CommandEmpty>
                        <CommandGroup>
                          {workspaces.map((ws) => (
                            <CommandItem
                              key={ws.id}
                              onSelect={() => handleSwitchWorkspace(ws.id)}
                              className="flex items-center space-x-2"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  currentWorkspace?.id === ws.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {ws.avatar && (
                                <Avatar className="h-5 w-5">
                                  <AvatarImage className='object-cover' src={ws.avatar} />
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(ws.name)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <span className="flex-1">{ws.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {onWorkspaceAdd && (
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setIsSwitcherOpen(false);
                                setIsAddWorkspaceOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              <span>Add Workspace</span>
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          )}
        </SidebarHeader> */}

          <SidebarHeader className="border-b">
            {state === "collapsed" ? (
              // --- COLLAPSED VIEW (WITH TOOLTIP) ---
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* We add padding here to center the logo */}
                  <div className="flex justify-center py-3">
                    <Image
                      src="/logo.png"
                      alt="Logo"
                      width={30}
                      height={30}
                      unoptimized
                      // This class prevents the image from shrinking
                      className="rounded-md flex-shrink-0"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{process.env.NEXT_PUBLIC_APP_NAME || "My Project"}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              // --- EXPANDED VIEW ---
              <div className="px-3 py-3 flex flex-col items-center text-center">
                <div className="flex flex-col items-center">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={30}
                    height={30}
                    unoptimized
                    // We add the class here too for consistency
                    className="rounded-md flex-shrink-0"
                  />
                  <h1 className="text-lg font-semibold truncate mt-2">
                    {process.env.NEXT_PUBLIC_APP_NAME || "My Project"}
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
          </SidebarHeader>

          {/* === SIDEBAR CONTENT === */}
          <SidebarContent>
            {navigationGroups.map((group, groupIndex) => (
              <SidebarGroup key={groupIndex}>
                {group.label && state !== "collapsed" && (
                  <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 py-2">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const hasChildren =
                        item.children && item.children.length > 0;

                      // --- COLLAPSED STATE LOGIC ---
                      if (state === "collapsed") {
                        if (hasChildren) {
                          // RENDER POPOVER FOR ITEMS WITH CHILDREN
                          return (
                            <Popover key={item.name}>
                              <PopoverTrigger asChild>
                                <SidebarMenuItem>
                                  <SidebarMenuButton
                                    isActive={isActiveLink(
                                      item.href,
                                      item.children
                                    )}
                                    className="justify-center"
                                  >
                                    {item.icon && (
                                      <item.icon className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">{item.name}</span>
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
                                    {item.name}
                                  </p>
                                  {item.children?.map((child) => (
                                    <Link
                                      key={child.name}
                                      href={child.href}
                                      className={cn(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent",
                                        pathname === child.href && "bg-accent"
                                      )}
                                    >
                                      {child.icon && (
                                        <child.icon className="h-4 w-4" />
                                      )}

                                      <span>{child.name}</span>
                                    </Link>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        } else {
                          // RENDER TOOLTIP FOR ITEMS WITHOUT CHILDREN
                          return (
                            <Tooltip key={item.name}>
                              <TooltipTrigger asChild>
                                <SidebarMenuItem>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={pathname === item.href}
                                    className="justify-center"
                                  >
                                    <Link href={item.href}>
                                      {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                      )}
                                      <span className="sr-only">
                                        {item.name}
                                      </span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>{item.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                      }

                      // --- EXPANDED STATE LOGIC (Your Original Code) ---
                      return (
                        <SidebarMenuItem key={item.name}>
                          {hasChildren ? (
                            <Collapsible
                              open={openGroups.has(item.name)}
                              onOpenChange={() => toggleGroup(item.name)}
                            >
                              <div className="flex items-center">
                                <SidebarMenuButton
                                  asChild
                                  isActive={
                                    isActiveLink(item.href, item.children) &&
                                    !openGroups.has(item.name)
                                  }
                                  className="flex-1"
                                >
                                  <Link
                                    href={item.href}
                                    className="flex items-center gap-2 w-full"
                                  >
                                    {item.icon && (
                                      <item.icon className="h-4 w-4" />
                                    )}

                                    <span className="flex-1">{item.name}</span>
                                    {item.badge && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs h-5"
                                      >
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
                                      toggleGroup(item.name);
                                    }}
                                  >
                                    {openGroups.has(item.name) ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </div>

                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {item.children?.map((child) => (
                                    <SidebarMenuSubItem key={child.name}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname === child.href}
                                      >
                                        <Link
                                          href={child.href}
                                          className="flex items-center gap-2 w-full"
                                        >
                                          {child.icon && (
                                            <child.icon className="h-4 w-4" />
                                          )}

                                          <span className="flex-1">
                                            {child.name}
                                          </span>
                                          {child.badge && (
                                            <Badge
                                              variant="secondary"
                                              className="text-xs h-4"
                                            >
                                              {child.badge}
                                            </Badge>
                                          )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.href}
                            >
                              <Link
                                href={item.href}
                                className="flex items-center gap-2 w-full"
                              >
                                {item.icon && <item.icon className="h-4 w-4" />}

                                <span className="flex-1">{item.name}</span>
                                {item.badge && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs h-5"
                                  >
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
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* === SIDEBAR FOOTER === */}
          {session?.user && (
            <SidebarFooter className="border-t">
              {state === "collapsed" ? (
                // --- COLLAPSED FOOTER ---
                <div className="flex justify-center p-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="h-8 w-8 cursor-pointer">
                        <AvatarImage
                          className="object-cover"
                          src={session.user.image || ""}
                          alt={session.user.name || "User"}
                        />
                        <AvatarFallback>
                          {getInitials(session.user.name || "")}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {session.user.name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {session.user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => signOut({ callbackUrl: "/sign-in" })}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                // --- EXPANDED FOOTER (Original Code) ---
                <SidebarMenu>
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          size="lg"
                          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage
                              className="object-cover"
                              src={session.user.avatar || ""}
                              alt={session.user.name || "User"}
                            />
                            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                              {getInitials(session.user.name || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                              {session.user.name}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {session.user.email}
                            </span>
                          </div>
                          <ChevronsUpDown className="ml-auto h-4 w-4" />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {session.user.name}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {session.user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => signOut({ callbackUrl: "/sign-in" })}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Sign Out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarFooter>
          )}
          <SidebarRail />
        </Sidebar>
      </TooltipProvider>
    </>
  );
}

// Mobile Header Component
export function MobileHeader() {
  const { isMobile } = useSidebar();
  const { data: session } = useSession();

  if (!isMobile) return null;

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background lg:hidden">
      <div className="flex items-center space-x-2">
        <SidebarTrigger className="h-8 w-8" />
        <span className="font-semibold">Dashboard</span>
      </div>

      {session?.user && (
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session.user.image || ""}
              alt={session.user.name || "User"}
            />
            <AvatarFallback>
              {getInitials(session.user.name || "")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:block">
            {session.user.name}
          </span>
        </div>
      )}
    </div>
  );
}
