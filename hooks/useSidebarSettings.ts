"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(j => j.data);

export type SidebarSettings = {
  id: string;
  spacingPreset: "NONE" | "SM" | "MD" | "LG";
  spacingPx?: number | null;
  accordionMode: "NONE" | "SINGLE" | "MULTI";
  defaultOpenGroupIds?: string[] | null;
  compact: boolean;
  showGroupTitles: boolean;
  iconSize: "SM" | "MD" | "LG";
};

export function useSidebarSettings() {
  const { data, error, isLoading, mutate } = useSWR<SidebarSettings>("/api/site-settings/sidebar/settings", fetcher);
  return { settings: data, isLoading, isError: error, mutate };
}