// @/components/layout/Header.tsx

"use client";
import { useRouter } from "next/navigation";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  HelpCircle,
  User,
  Settings,
  LogOut,
  Search,
  Calendar,
} from "lucide-react";
import { signOut } from "next-auth/react";

// Import UI components
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { type LucideIcon } from "lucide-react";
import { FeedbackDialog } from "./FeedbackDialog";
import { NotificationPopover } from "@/components/notification-module/NotificationDialog";
import { WorldClockTooltip } from "../extra/world-clock";

// Import newly needed components for the command palette
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Import SidebarTrigger component
import { SidebarTrigger } from "@/components/ui/sidebar";

type UserMenuItem =
  | {
      type: "link";
      label: string;
      icon: LucideIcon;
      href: (userId: string) => string;
    }
  | {
      type: "button";
      label: string;
      icon: LucideIcon;
      onClick: () => void;
      isDestructive?: boolean;
    }
  | {
      type: "separator";
    };

const userMenuItems: UserMenuItem[] = [
  {
    type: "link",
    label: "Profile",
    icon: User,
    href: (userId) => `/account/${userId}`,
  },
  {
    type: "link",
    label: "Settings",
    icon: Settings,
    href: (userId) => `/account/${userId}/settings`,
  },
  {
    type: "separator",
  },
  {
    type: "button",
    label: "Logout",
    icon: LogOut,
    onClick: () => signOut(),
    isDestructive: true,
  },
];

export function Header({ session, className }: { session: any; className: string }) {
  const router = useRouter();

  const user = session?.user;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false); // State for the command dialog

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut listener (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  if (!user) return null;

  return (
    <>
      <header className={`sticky top-0 left-0 right-0 flex items-center justify-between h-[4.5rem] px-4 md:px-6 backdrop-blur-md dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50 ${className}`}>
        {/* Left Section: Logo and App Name */}
        <div className="flex items-center gap-4 overflow-hidden">
          <Button
            variant="outline"
            className="w-md h-9 justify-between text-muted-foreground hover:text-foreground text-sm font-normal"
            onClick={() => setOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search...
            </div>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
        {/* Center Section: Search Trigger */}

        {/* Right Section: Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {mounted && theme === "dark" ? (
              <Sun className="size-[18px]" />
            ) : (
              <Moon className="size-[18px]" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <WorldClockTooltip />
          <NotificationPopover />
          <FeedbackDialog>
            <Button variant="ghost" className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              <span className="hidden sm:inline">Help</span>
            </Button>
          </FeedbackDialog>
          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer capitalize">
                <AvatarImage
                  src={user?.avatar || ""}
                  alt={user?.name || "@user"}
                />
                <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <span className="font-medium truncate">{user?.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <Separator />
              {userMenuItems.map((item, index) => {
                if (item.type === "separator") {
                  return <DropdownMenuSeparator key={`separator-${index}`} />;
                }
                if (item.type === "button") {
                  return (
                    <DropdownMenuItem
                      key={item.label}
                      onClick={item.onClick}
                      className={
                        item.isDestructive
                          ? "text-destructive focus:text-destructive cursor-pointer"
                          : "cursor-pointer"
                      }
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  );
                }
                if (item.type === "link") {
                  return (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link
                        href={item.href(user.id)}
                        className="flex items-center cursor-pointer"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                }
                return null;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Dialog Component */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            {/* 3. Use onSelect for navigation */}
            <CommandItem
              onSelect={() => {
                router.push(`/projects/user-work/${user.id}`);
                setOpen(false); // Closes the dialog after navigating
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>My Task</span>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                router.push(`/account/${user.id}`); // Example link
                setOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                router.push(`/account/${user.id}/settings`); // Example link
                setOpen(false);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}