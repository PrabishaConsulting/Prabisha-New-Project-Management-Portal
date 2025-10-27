"use client";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Rectangle } from "recharts";

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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// Recharts Components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, TooltipProps, LabelList } from "recharts";

// --- Types ---
interface ChartDataItem {
  userId: string;
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

// --- Helper function to get first name ---
const getFirstName = (fullName: string): string => {
  if (!fullName) return "";
  // Split by space or dot and take the first part
  const firstName = fullName.split(/[\s.]+/)[0];
  return firstName;
};

// --- Custom Tooltip Component ---
const CustomTooltip = ({ active, payload, label }: TooltipProps<string, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 min-w-[200px]">
        <p className="font-semibold text-lg mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm font-medium">{entry.name}</span>
              </div>
              <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// --- Custom Bar Shape with Hover Effect ---
const CustomBarShape = (props: any) => {
  const { fill, x, y, width, height, ...rest } = props;
  
  return (
    <Rectangle
      {...rest}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx="4"
      ry="4"
      className="transition-all duration-200 hover:opacity-80"
    />
  );
};

// --- Main Component ---
export const PendingTasksChart = ({ departments }: { departments: any }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    departmentId: searchParams.get("departmentId") || "ALL",
  });

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString());

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
      router.push(
        `${pathname}?userId=${clickedData.userId}&userName=${encodeURIComponent(
          clickedData.user
        )}`
      );
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Top 10 Users by Pending Tasks</CardTitle>
            <CardDescription>
              Shows the top 10 users with the most tasks in "To Do" or "In
              Progress" status.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center justify-center h-[300px] text-destructive">
            Failed to load chart data.
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center h-[300px]">
            Loading chart...
          </div>
        )}
        {data && data.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[600px] w-full">
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 40, right: 30, left: 20, bottom: 80 }}
              onClick={handleBarClick}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="user"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => getFirstName(value)}
              />
              <YAxis type="number" />
              <ChartTooltip content={<CustomTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="URGENT"
                stackId="a"
                fill={chartConfig.URGENT.color}
                barSize={40}
                shape={<CustomBarShape />}
                cursor="pointer"
              />
              <Bar
                dataKey="HIGH"
                stackId="a"
                fill={chartConfig.HIGH.color}
                barSize={40}
                shape={<CustomBarShape />}
                cursor="pointer"
              />
              <Bar
                dataKey="MEDIUM"
                stackId="a"
                fill={chartConfig.MEDIUM.color}
                barSize={40}
                shape={<CustomBarShape />}
                cursor="pointer"
              />
              <Bar
                dataKey="LOW"
                stackId="a"
                fill={chartConfig.LOW.color}
                barSize={40}
                shape={<CustomBarShape />}
                cursor="pointer"
              >
                <LabelList
                  dataKey="total"
                  position="top"
                  offset={10}
                  className="fill-foreground font-medium"
                  fontSize={15}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
        {data && data.length === 0 && (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No pending tasks found for the selected criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};