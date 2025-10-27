// components/AssetDashboard.tsx
"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import type { Asset } from "@/app/generated/client";
import Link from "next/link";
import { RefreshCw, Pencil } from "lucide-react";
import { differenceInDays, format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge"; // Assuming you have this component

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getExpiryInfo = (expiryDate: Date) => {
  const days = differenceInDays(new Date(expiryDate), new Date());
  let color = "text-foreground";
  if (days <= 7) color = "text-destructive";
  else if (days <= 30) color = "text-yellow-500";
  return { days, color };
};

export default function AssetDashboard() {
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
      await mutate("/api/assets");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Live</TableHead>
              <TableHead>Expires In</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets && assets.length > 0 ? (
              assets.map((asset) => {
                const { days, color } = getExpiryInfo(asset.expiryDate);
                return (
                  <TableRow
                    key={asset.id}
                    className={
                      asset.status === "EXPIRED" ? "bg-destructive/10" : ""
                    }
                  >
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.assetType}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={asset.status} />
                    </TableCell>
                    <TableCell>
                      {asset.assetType === "DOMAIN" ? (
                        <StatusBadge status={asset.liveStatus} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className={color}>
                      {days > 0 ? `${days} days` : "Expired"}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(asset.expiryDate), "PPP")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end space-x-2">
                         {asset.assetType === "DOMAIN" && (
                           <Button
                             variant="outline"
                             size="icon"
                             onClick={() => handleRefresh(asset.id)}
                             disabled={checkingId === asset.id}
                             title="Refresh Live Status"
                           >
                             <RefreshCw
                               className={`h-4 w-4 ${
                                 checkingId === asset.id ? "animate-spin" : ""
                               }`}
                             />
                           </Button>
                         )}
                         <Link href={`/assets/edit/${asset.id}`} passHref>
                           <Button variant="outline" size="icon" title="Edit Asset">
                             <Pencil className="h-4 w-4" />
                           </Button>
                         </Link>
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No assets found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}