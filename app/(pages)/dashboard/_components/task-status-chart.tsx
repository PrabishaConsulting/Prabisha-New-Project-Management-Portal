"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Cell , YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// 1. Updated data for pending tasks by department
const chartData = [
  { department: "Engineering", pending: 35 },
  { department: "Marketing", pending: 42 },
  { department: "Sales", pending: 18 },
  { department: "Design", pending: 28 },
  { department: "Support", pending: 21 },
  { department: "HR", pending: 12 },
]

// 2. Updated chart config for the 'pending' data series
const chartConfig = {
  pending: {
    label: "Pending Tasks",
    // Base color for tooltips and fallbacks
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function DepartmentPendingTasksChart({ pendingTasks} : { pendingTasks : any}) {
  return (
    <Card>
  <CardHeader>
    <CardTitle>Pending Tasks by Department</CardTitle>
    <CardDescription>Current open tasks for each team</CardDescription>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig}>
      <BarChart accessibilityLayer data={pendingTasks}>
        <CartesianGrid vertical={false} />

        {/* --- X-AXIS --- */}
        <XAxis
          dataKey="department"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />

        {/* --- Y-AXIS --- */}
        <YAxis
          stroke="var(--muted-foreground)"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />

        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="pending" radius={8}>
          {pendingTasks.map((_: any, index: number) => (
            <Cell
              key={`cell-${index}`}
              fill={`var(--chart-${index + 1})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  </CardContent>
  <CardFooter className="flex-col items-start gap-2 text-sm">
    <div className="flex gap-2 font-medium leading-none">
      Engineering has the most pending tasks <TrendingUp className="h-4 w-4" />
    </div>
    <div className="leading-none text-muted-foreground">
      Showing total pending tasks across all departments
    </div>
  </CardFooter>
</Card>
  )
}