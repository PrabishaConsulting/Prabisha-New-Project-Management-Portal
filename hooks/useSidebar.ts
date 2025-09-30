"use client";

import useSWR from "swr";

// Fetch and unwrap the API response to return only the theme object
const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const json = await res.json();
    return json?.data ?? null;
  });

import { useSession } from "next-auth/react";

export function useSidebar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const { data, error, isLoading } = useSWR(
    `/api/site-settings/sidebar${role ? `?role=${encodeURIComponent(role)}` : ''}`,
    fetcher
  );

  return {
    sidebar: data,
    isLoading,
    isError: error,
  };
}
