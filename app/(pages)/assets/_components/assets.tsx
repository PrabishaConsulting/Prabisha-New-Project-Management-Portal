// app/assets/page.tsx

"use client";

import useSWR, { mutate } from "swr";
import { useState } from "react";
import type { Asset } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { columns, AssetData } from "./assets.coloumn";
import { AssetTable } from "./assets.table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AssetsPageComponent() {
  const {
    data: assets,
    error,
    isLoading,
  } = useSWR<Asset[]>("/api/assets", fetcher);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleRefresh = async (id: string) => {
    setCheckingId(id);
    try {
      await fetch(`/api/assets/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await mutate("/api/assets"); // Re-fetch the data
    } catch (err) {
      console.error("Failed to refresh asset:", err);
    } finally {
      setCheckingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-center text-destructive p-8">
        <CardTitle>Failed to load assets.</CardTitle>
      </Card>
    );
  }

  // Add the refresh handler and checkingId to each asset object
  const tableData: AssetData[] = assets
    ? assets.map((asset) => ({
        ...asset,
        handleRefresh,
        checkingId,
      }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <AssetTable columns={columns} data={tableData} />
      </CardContent>
    </Card>
  );
}