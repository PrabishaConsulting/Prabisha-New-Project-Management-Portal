'use client';

import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import * as LucideIcons from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton"; // <- shadcn skeleton
import { useSidebar } from "@/hooks/useSidebar";
import { useSidebarSettings } from "@/hooks/useSidebarSettings";

// Utility: map DB icon string -> Lucide component
const getIcon = (iconName: string | null | undefined) => {
  if (!iconName) return LucideIcons.Circle; // fallback icon
  const IconComponent = (LucideIcons as any)[
    iconName.charAt(0).toUpperCase() + iconName.slice(1)
  ];
  return IconComponent || LucideIcons.Circle;
};


export default function AppSidebar({ siteName, logoUrl }: { siteName?: string | null; logoUrl?: string | null }) {
  const { sidebar, isLoading: isLoadingSidebar } = useSidebar();
  const pathname = usePathname();
  const base = React.useMemo(() => pathname.split("/")[1] || "", [pathname]);

  const { settings } = useSidebarSettings();

  // derive UI from settings
  const showTitles = settings?.showGroupTitles !== false;
  const menuButtonSize = (settings?.compact ? "sm" : "default") as "sm" | "default";
  const iconSizeClass = React.useMemo(() => {
    const s = settings?.iconSize ?? "MD";
    if (s === "SM") return "size-3";
    if (s === "LG") return "size-5";
    return "size-4";
  }, [settings]);

  const groupGapStyle = React.useMemo(() => {
    if (!settings) return undefined;
    if (settings.spacingPx != null && !Number.isNaN(settings.spacingPx)) {
      return { gap: `${settings.spacingPx}px` } as React.CSSProperties;
    }
    const preset = settings.spacingPreset;
    const px = preset === "NONE" ? 0 : preset === "SM" ? 4 : preset === "LG" ? 12 : 8; // MD default 8
    return { gap: `${px}px` } as React.CSSProperties;
  }, [settings]);

  // simple accordion handling
  const [openGroups, setOpenGroups] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!settings || !sidebar) return;
    const ids = sidebar.map((g: any) => g.id).filter(Boolean);
    if (settings.accordionMode === "NONE") {
      setOpenGroups(ids);
      return;
    }
    if (settings.accordionMode === "SINGLE") {
      const initial = settings.defaultOpenGroupIds?.[0] ?? ids[0];
      setOpenGroups(initial ? [initial] : []);
      return;
    }
    // MULTI
    const initialMulti = settings.defaultOpenGroupIds && settings.defaultOpenGroupIds.length > 0
      ? settings.defaultOpenGroupIds
      : ids;
    setOpenGroups(initialMulti);
  }, [settings, sidebar]);

  const isGroupOpen = React.useCallback(
    (id: string) => {
      if (!settings) return true;
      if (settings.accordionMode === "NONE") return true;
      return openGroups.includes(id);
    },
    [settings, openGroups]
  );

  const toggleGroup = React.useCallback(
    (id: string) => {
      if (!settings || settings.accordionMode === "NONE") return;
      if (settings.accordionMode === "SINGLE") {
        setOpenGroups((cur) => (cur.includes(id) ? cur : [id]));
        return;
      }
      // MULTI
      setOpenGroups((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    },
    [settings]
  );

  const normalizeHref = React.useCallback(
    (href: string) => {
      if (!href) return "/";
      const trimmed = href.trim();
      const noLeading = trimmed.replace(/^\/+/, "");
      const firstSeg = noLeading.split("/")[0];

      if (trimmed.startsWith("/") && ["admin", "super-admin", "user"].includes(firstSeg)) {
        return `/${noLeading}`;
      }
      if (trimmed.startsWith("/")) {
        return `/${base}/${noLeading}`;
      }
      if (["admin", "super-admin", "user"].includes(firstSeg)) {
        return `/${noLeading}`;
      }
      return `/${base}/${noLeading}`;
    },
    [base]
  );

  return (
    <Sidebar collapsible="icon" className="z-20">
      <SidebarHeader className="flex items-start justify-between relative px-4 py-2 border-b-2 z-50">
        <div className="flex flex-col items-start gap-1">
          {logoUrl ? (
            <Image
              src={logoUrl }
              alt={`${siteName} Logo`}
              className="contain group-data-[state=collapsed]:hidden dark:brightness-0 dark:invert"
              width={160}
              height={50}
              unoptimized
            />
          ) : (
            <Image
              src="/icons/logo.png"
              alt="Default Logo"
              className="contain group-data-[state=collapsed]:hidden dark:brightness-0 dark:invert"
              width={160}
              height={50}
              unoptimized
            />
          )}
          <div className="group-data-[state=collapsed]:hidden">
            <span className="mt-2 text-xs uppercase font-extrabold leading-none bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent dark:hidden">
              {siteName || "Prabisha Consulting"}
            </span>
            <span className=" text-xs uppercase font-extrabold leading-none text-primary dark:text-white hidden dark:inline">
              {siteName || "Prabisha Consulting"}
            </span>
          </div>
        </div>

        <span className="text-[10px] group-data-[state=collapsed]:hidden">
          Powered by{" "}
          <Link
            href="https://prabisha.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-bold dark:text-white"
          >
            Prabisha Consulting
          </Link>
        </span>

        <SidebarTrigger className="h-7 w-7 rounded-full absolute z-50 top-6 -right-4 bg-primary text-primary-foreground hover:bg-primary/90" />
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto px-2" style={groupGapStyle}>
        {isLoadingSidebar ? (
          <div className="space-y-4 px-2">
            {/* Fake groups */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" /> {/* group label */}
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" /> {/* icon */}
                      <Skeleton className="h-3 w-28" /> {/* text */}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sidebar?.length > 0 ? (
          sidebar.map((group: any) => (
            <SidebarGroup key={group.id}>
              {group.title === "Site Settings" ? (
                <SidebarGroupLabel
                  asChild
                  className={`uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""}`}
                >
                  <Link href={`/${base}/site-settings`}>{group.title}</Link>
                </SidebarGroupLabel>
              ) : (
                <SidebarGroupLabel
                  className={`uppercase text-xs font-bold text-muted-foreground group-data-[collapsible=icon]:hidden ${!showTitles ? "hidden" : ""}`}
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    {group.title}
                    <LucideIcons.ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isGroupOpen(group.id) ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </SidebarGroupLabel>
              )}
              {isGroupOpen(group.id) && (
                <SidebarGroupContent>
                  <SidebarMenu className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
                    {group.items.map((item: any) => {
                      const Icon = getIcon(item.icon);
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton asChild size={menuButtonSize}>
                            <Link href={normalizeHref(item.href)}>
                              <Icon className={iconSizeClass} />
                              <span className="group-data-[collapsible=icon]:sr-only">
                                {item.label}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          ))
        ) : (
          <p className="text-muted-foreground text-sm px-2">No menu found</p>
        )}

        
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}