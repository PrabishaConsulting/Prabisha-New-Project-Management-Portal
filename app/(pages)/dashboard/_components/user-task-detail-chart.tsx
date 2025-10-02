"use client";
import React from "react";
import useSWR from "swr";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// shadcn/ui Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Recharts Components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

// --- Types ---
interface UserStatusData {
  TO_DO: number;
  IN_PROGRESS: number;
  REVIEW: number;
  DONE: number;
}

// --- SWR Fetcher ---
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Chart Configuration ---
const chartConfig = {
  tasks: {
    label: "Number of Tasks",
  },
} satisfies ChartConfig;

// --- Colors for each status ---
const statusColors = {
  TO_DO: "var(--chart-1)",
  IN_PROGRESS: "var(--chart-2)",
  REVIEW: "var(--chart-3)",
  DONE: "var(--chart-4)",
};

// --- Main Component ---
export const UserTaskDetailChart = ({ userId, userName }: { userId: string; userName: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const apiUrl = `/api/tasks/user-status-summary?userId=${userId}`;
  const { data, error, isLoading } = useSWR<UserStatusData>(apiUrl, fetcher);
  console.log(data);
  // Transform data for Recharts
  const chartData = data ? Object.entries(data).map(([status, count]) => ({
    name: status.replace('_', ' '),
    count,
  })) : [];

  console.log(chartData , "test");

  const handleBackClick = () => {
    // Navigate back to the base dashboard page, removing the userId query param
    router.push(pathname);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button onClick={handleBackClick} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Task Status for {userName}</CardTitle>
            <CardDescription>
              A breakdown of all tasks assigned to this user by status.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="flex items-center justify-center h-[350px] text-destructive">Failed to load data.</div>}
        {isLoading && <div className="flex items-center justify-center h-[350px]">Loading chart...</div>}
        {data && (
              <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[600px] w-full"
        >
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.name.toUpperCase().replace(' ', '_') as keyof typeof statusColors]} />
                ))}
              </Bar>
            </BarChart>
            </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};