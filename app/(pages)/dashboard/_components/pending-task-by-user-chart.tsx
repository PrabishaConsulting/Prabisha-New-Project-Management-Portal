"use client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// Recharts Components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// --- Types ---
interface ChartDataItem {
  userId: string; // <-- ADDED
  user: string;
  URGENT: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  total: number;
}

// --- SWR Fetcher ---
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }
    return res.json();
  });

// --- Chart Configuration ---
const chartConfig = {
  total: {
    label: "Total Tasks",
  },
  URGENT: {
    label: "Urgent",
    color: "var(--color-urgent)",
  },
  HIGH: {
    label: "High",
    color: "var(--color-high)",
  },
  MEDIUM: {
    label: "Medium",
    color: "var(--color-medium)",
  },
  LOW: {
    label: "Low",
    color: "var(--color-low)",
  },
} satisfies ChartConfig;

// --- Main Component ---
export const PendingTasksChart = ({ departments }: { departments: any }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- FIX: Use 'ALL' as a default value to avoid empty string issues ---
  const [filters, setFilters] = useState({
    departmentId: searchParams.get("departmentId") || "ALL",
  });

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString());

    // --- FIX: Handle the 'ALL' case correctly ---
    if (filters.departmentId && filters.departmentId !== "ALL") {
      newSearchParams.set("departmentId", filters.departmentId);
    } else {
      newSearchParams.delete("departmentId");
    }

    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });
  }, [filters, router, pathname, searchParams]);

  const queryString = new URLSearchParams(
    Object.entries(filters).filter(([_, value]) => value && value !== "ALL")
  ).toString();

  const apiUrl = `/api/tasks/user-summary?${queryString}`;

  const { data, error, isLoading } = useSWR<ChartDataItem[]>(apiUrl, fetcher);


  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedData = data.activePayload[0].payload as ChartDataItem;
      // Navigate with both userId and userName
      router.push(
        `${pathname}?userId=${clickedData.userId}&userName=${encodeURIComponent(
          clickedData.user
        )}`
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            {/* --- CHANGE: Updated title and description --- */}
            <CardTitle>Top 6 Users by Pending Tasks</CardTitle>
            <CardDescription>
              Shows the top 6 users with the most tasks in "To Do" or "In
              Progress" status.
            </CardDescription>
          </div>
          {/* --- FIX: Improved Select component with a clear "All" option --- */}
          {/* <Select
            value={filters.departmentId}
            onValueChange={(value) => handleFilterChange("departmentId", value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center justify-center h-[400px] text-destructive">
            Failed to load chart data.
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center h-[400px]">
            Loading chart...
          </div>
        )}
        {data && data.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[600px] w-full">
            {/* --- CHANGE: Converted to a vertical bar chart --- */}
            <BarChart
              accessibilityLayer
              data={data}
              // layout="vertical" is the default, so we remove the horizontal prop
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // Increased bottom margin for labels
              onClick={handleBarClick}
            >
              <CartesianGrid vertical={false} />
              {/* --- CHANGE: Swapped X and Y axis configurations --- */}
              <XAxis
                dataKey="user"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                // Rotate labels to prevent overlap
                angle={-40}
                textAnchor="end"
                height={100}
              />
              <YAxis type="number" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="URGENT"
                stackId="a"
                fill={chartConfig.URGENT.color}
              />
              <Bar dataKey="HIGH" stackId="a" fill={chartConfig.HIGH.color} />
              <Bar
                dataKey="MEDIUM"
                stackId="a"
                fill={chartConfig.MEDIUM.color}
              />
              <Bar dataKey="LOW" stackId="a" fill={chartConfig.LOW.color} />
            </BarChart>
          </ChartContainer>
        )}
        {data && data.length === 0 && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No pending tasks found for the selected criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
