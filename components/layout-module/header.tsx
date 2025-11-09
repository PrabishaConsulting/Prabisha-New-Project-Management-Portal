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
  Megaphone,
  Star,
  TrendingUp,
  Sparkles,
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
import { Marquee } from "../ui/marquee";

// Import Marquee component
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

// Announcement items for the marquee
const announcements = [
  {
    icon: Megaphone,
    text: "New feature: Task time tracking now available!",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Star,
    text: "Welcome to the new dashboard experience",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    icon: TrendingUp,
    text: "Team productivity increased by 25% this month",
    color: "text-green-600 dark:text-green-400",
  },
  {
    icon: Sparkles,
    text: "Check out our new project templates",
    color: "text-amber-600 dark:text-amber-400 ",
  },
];

export function Header({
  session,
  className,
  role,
}: {
  session: any;
  className: string;
  role: string;
}) {
  const router = useRouter();

  const user = session?.user;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showMarquee, setShowMarquee] = useState(true); // Control marquee visibility

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
      <header
        className={`sticky top-0 left-0 right-0 backdrop-blur-md dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800 shadow-sm z-50 ${className}`}
      >
        {/* 🧑‍💼 Admin Banner */}
        {role.toLocaleLowerCase() === "admin" && (
          <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-center py-2 px-4 flex items-center justify-center gap-3">
            <span className="font-medium tracking-wide">
              🔒 Admin Mode — You have elevated privileges.
            </span>

            {/* ✅ Admin Link Button */}
            <a
              href="/admin"
              className="ml-2 inline-flex items-center rounded-md bg-white/20 hover:bg-white/30 text-white px-3 py-1 text-sm font-semibold transition-all duration-150"
            >
              Go to Admin Panel →
            </a>
          </div>
        )}

        {/* Marquee Announcement Bar */}
        {showMarquee && (
          <div className="relative flex w-full items-center justify-center overflow-hidden border-b border-border/50 bg-muted/40 dark:bg-muted/10">
            <Marquee pauseOnHover className="[--duration:30s] py-2">
              {announcements.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-6">
                  <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-1 shadow-sm ring-1 ring-border backdrop-blur-md">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span
                      className={`text-sm font-medium tracking-tight ${item.color}`}
                    >
                      {item.text}
                    </span>
                  </div>
                </div>
              ))}
            </Marquee>

            {/* fade edges for smooth entry/exit */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-background to-transparent"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-background to-transparent"></div>
          </div>
        )}

        {/* Main Header Content */}
        <div className="flex items-center justify-between h-[4rem] px-4 md:px-6">
          {/* Left Section: Search Button */}
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

          {/* Right Section: Actions */}
          <div className="flex items-center gap-4">
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
            <NotificationPopover userId={user?.id} />
            <FeedbackDialog>
              <Button variant="ghost" className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </FeedbackDialog>
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
              <DropdownMenuContent align="end" className="w-56 z-999">
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
        </div>
      </header>

      {/* Command Dialog Component */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem
              onSelect={() => {
                router.push(`/projects/user-work/${user.id}`);
                setOpen(false);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>My Task</span>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                router.push(`/account/${user.id}`);
                setOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </CommandItem>

            <CommandItem
              onSelect={() => {
                router.push(`/account/${user.id}/settings`);
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
