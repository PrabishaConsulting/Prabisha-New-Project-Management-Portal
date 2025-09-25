"use client"

import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Cell, YAxis, ResponsiveContainer } from "recharts"

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

const chartData = [
  { department: "Engineering", pending: 35 },
  { department: "Marketing", pending: 42 },
  { department: "Sales", pending: 18 },
  { department: "Design", pending: 28 },
  { department: "Support", pending: 21 },
  { department: "HR", pending: 12 },
]

const chartConfig = {
  pending: {
    label: "Pending Tasks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function DepartmentPendingTasksChart({ pendingTasks }: { pendingTasks: any }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  return (
    <Card className="shadow-lg border-0 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold ">Pending Tasks by Department</CardTitle>
        <CardDescription className="">Current open tasks for each team</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart 
            accessibilityLayer 
            data={pendingTasks}
            margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
            
            <XAxis
              dataKey="department"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            
            <YAxis
              stroke="#9ca3af"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            
            <ChartTooltip
              cursor={{ fill: "#f3f4f6", radius: 4 }}
              content={<ChartTooltipContent hideLabel />}
            />
            
            <Bar 
            barSize={80}
              dataKey="pending" 
              radius={[6, 6, 0, 0]}
              onMouseOver={(_, index) => setActiveIndex(index)}
              onMouseOut={() => setActiveIndex(null)}
            >
              {pendingTasks.map((_: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`var(--chart-${index + 1})`}
                  stroke={activeIndex === index ? "#fff" : "none"}
                  strokeWidth={activeIndex === index ? 2 : 0}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.7}
                  className="transition-all  duration-300 ease-out"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm pt-4 border-t border-gray-100">
        <div className="flex gap-2 font-medium leading-none ">
          Engineering has the most pending tasks <TrendingUp className="h-4 w-4 text-green-500" />
        </div>
        <div className="leading-none ">
          Showing total pending tasks across all departments
        </div>
      </CardFooter>
    </Card>
  )
}