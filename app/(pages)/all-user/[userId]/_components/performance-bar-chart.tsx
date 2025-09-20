// PerformanceBarChart.tsx
"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis , YAxis , Cell} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

type ChartData = { name: string; total: number; };
interface PerformanceBarChartProps { data: ChartData[]; }

const barColors = [
  "var(--chart-3)", // Low - Green
  "var(--chart-2)", // Medium - Orange  
  "var(--chart-1)", // High - Red
];

export const PerformanceBarChart = ({ data }: PerformanceBarChartProps) => {
  const chartConfig = {
    total: {
      label: "Tasks",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <BarChart  
        accessibilityLayer
        data={data}
        margin={{
          top: 40,
          right: 20,
          bottom: 20,
          left: 20,
        }}
        barCategoryGap="20%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />

        <XAxis  
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false} 
          fontSize={14}
          fontWeight={500}
        />
        <YAxis 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          allowDecimals={false}
          width={40}
        />
        <ChartTooltip
          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
          content={<ChartTooltipContent 
            hideLabel={false}
            labelFormatter={(value) => `Priority: ${value}`}
            formatter={(value, name) => [value, 'Tasks']}
          />}
        />
        <Bar 
          dataKey="total" 
          radius={[6, 6, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={barColors[index % barColors.length]} 
            />
          ))}
          <LabelList
            position="top"
            offset={8}
            className="fill-foreground"
            fontSize={12}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};
