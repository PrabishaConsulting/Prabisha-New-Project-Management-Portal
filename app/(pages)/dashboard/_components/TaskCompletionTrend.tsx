// components/TaskCompletionTrend.tsx
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTaskCompletionTrendData } from "@/actions/task-action"

export const description = "Task completion trend visualization"

const chartConfig = {
  tasks: {
    label: "Tasks",
  },
  created: {
    label: "Tasks Created",
    color: "var(--chart-1)",
  },
  completed: {
    label: "Tasks Completed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface TaskCompletionTrendProps {
  initialData?: Array<{date: string, created: number, completed: number}>
}

export function TaskCompletionTrend({ initialData }: TaskCompletionTrendProps) {
  const [timeRange, setTimeRange] = React.useState("90d")
  const [chartData, setChartData] = React.useState<Array<{date: string, created: number, completed: number}>>(initialData || [])
  const [isLoading, setIsLoading] = React.useState(!initialData)

  // Fetch data on component mount only if initialData is not provided
  React.useEffect(() => {
    if (!initialData) {
      const fetchData = async () => {
        setIsLoading(true)
        try {
          const data = await getTaskCompletionTrendData()
          setChartData(data)
        } catch (error) {
          console.error("Error loading task data:", error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [initialData])

  // Filter data based on selected time range
  const filteredData = React.useMemo(() => {
    if (chartData.length === 0) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to beginning of today
    
    let startDate = new Date(today)
    
    switch (timeRange) {
      case "7d":
        startDate.setDate(today.getDate() - 7)
        break
      case "14d":
        startDate.setDate(today.getDate() - 14)
        break
      case "30d":
        startDate.setDate(today.getDate() - 30)
        break
      case "90d":
        startDate.setDate(today.getDate() - 90)
        break
      default:
        startDate.setDate(today.getDate() - 90)
    }
    
    return chartData.filter((item) => {
      const itemDate = new Date(item.date)
      return itemDate >= startDate && itemDate <= today
    })
  }, [chartData, timeRange])

  // Calculate statistics based on filtered data
  const totalTasks = React.useMemo(() => {
    return filteredData.reduce((sum, day) => sum + day.created, 0)
  }, [filteredData])

  const maxCreatedDay = React.useMemo(() => {
    if (filteredData.length === 0) return { date: "", created: 0 }
    return filteredData.reduce((max, day) => day.created > max.created ? day : max, filteredData[0])
  }, [filteredData])

  const maxCompletedDay = React.useMemo(() => {
    if (filteredData.length === 0) return { date: "", completed: 0 }
    return filteredData.reduce((max, day) => day.completed > max.completed ? day : max, filteredData[0])
  }, [filteredData])

  // Calculate average tasks created and completed per day
  const avgCreatedPerDay = React.useMemo(() => {
    if (filteredData.length === 0) return 0
    const totalCreated = filteredData.reduce((sum, day) => sum + day.created, 0)
    return (totalCreated / filteredData.length).toFixed(1)
  }, [filteredData])

  const avgCompletedPerDay = React.useMemo(() => {
    if (filteredData.length === 0) return 0
    const totalCompleted = filteredData.reduce((sum, day) => sum + day.completed, 0)
    return (totalCompleted / filteredData.length).toFixed(1)
  }, [filteredData])

  if (isLoading) {
    return (
      <Card className="pt-0">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading task data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="pt-0">
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">No task data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="pt-0">
      <CardHeader className=" space-y-4 border-b p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Task Completion Trend</CardTitle>
            <CardDescription>
              Track task creation and completion over time
            </CardDescription>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="w-[160px] rounded-lg"
              aria-label="Select a time range"
            >
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="14d" className="rounded-lg">
                Last 14 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Statistics Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-muted-foreground">Most Tasks Created</p>
            <p className="text-lg font-semibold">{maxCreatedDay.created} tasks</p>
            <p className="text-sm text-muted-foreground">
              {maxCreatedDay.date ? new Date(maxCreatedDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-muted-foreground">Most Tasks Completed</p>
            <p className="text-lg font-semibold">{maxCompletedDay.completed} tasks</p>
            <p className="text-sm text-muted-foreground">
              {maxCompletedDay.date ? new Date(maxCompletedDay.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
            <p className="text-lg font-semibold">{avgCreatedPerDay} created</p>
            <p className="text-lg font-semibold">{avgCompletedPerDay} completed</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-muted-foreground">No task data available for the selected time range</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="created"
                type="monotone"
                fill="url(#fillCreated)"
                stroke="var(--color-created)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <Area
                dataKey="completed"
                type="monotone"
                fill="url(#fillCompleted)"
                stroke="var(--color-completed)"
                strokeWidth={2}
                activeDot={{ r: 6 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}