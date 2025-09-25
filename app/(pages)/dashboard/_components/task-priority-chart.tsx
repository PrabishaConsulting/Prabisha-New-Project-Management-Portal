// src/app/dashboard/_components/task-priority-chart.tsx
"use client";

import { TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, LabelList } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

interface TaskPriorityChartProps {
  tasksByPriority: {
    priority: string;
    count: number;
  }[];
}

const priorityColors = {
  Urgent: "var(--chart-1)", // Red
  High: "var(--chart-2)",   // Orange
  Medium: "var(--chart-3)", // Yellow
  Low: "var(--chart-4)",    // Green
};

export function TaskPriorityChart({ tasksByPriority }: TaskPriorityChartProps) {
  // Calculate total tasks for percentage
  const totalTasks = tasksByPriority.reduce((sum, item) => sum + item.count, 0);

  // Create chart config
  const chartConfig: ChartConfig = {
    count: {
      label: "Tasks",
    },
    Urgent: {
      label: "Urgent",
      color: "var(--chart-1)",
    },
    High: {
      label: "High",
      color: "var(--chart-2)",
    },
    Medium: {
      label: "Medium",
      color: "var(--chart-3)",
    },
    Low: {
      label: "Low",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  // Transform data to match the expected format
  const chartData = tasksByPriority.map(item => ({
    priority: item.priority,
    count: item.count,
    fill: priorityColors[item.priority as keyof typeof priorityColors],
  }));

  // Find the priority with the most tasks
  const highestPriority = tasksByPriority.reduce((prev, current) => 
    (prev.count > current.count) ? prev : current
  );

  // Custom label component
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index, name
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${name}:${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="flex flex-col shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-xl font-bold ">Task Priority Distribution</CardTitle>
        <CardDescription className="">Tasks categorized by priority level</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="h-80">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="priority"
                stroke="0"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {tasksByPriority.map((item) => (
            <div key={item.priority} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: priorityColors[item.priority as keyof typeof priorityColors] }}
              />
              <div>
                <p className="text-sm font-medium">{item.priority}</p>
                <p className="text-xs text-muted-foreground">
                  {item.count} tasks ({totalTasks ? Math.round((item.count / totalTasks) * 100) : 0}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 font-medium leading-none ">
          {highestPriority.priority} has the most tasks <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="leading-none ">
          <Badge variant="outline" className="text-xs">
            Total: {totalTasks} tasks
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
}