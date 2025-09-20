"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type ChartData = {
  subject: string;
  value: number;
  fullMark: number;
};

interface PerformanceRadarChartProps {
  data: ChartData[];
}

export const PerformanceRadarChart = ({ data }: PerformanceRadarChartProps) => {
  const chartConfig = {
    value: {
      label: "Tasks",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <RadarChart 
        data={data}
        margin={{
          top: 20,
          right: 80,
          bottom: 20,
          left: 80,
        }}
      >
        <ChartTooltip 
          cursor={false} 
          content={<ChartTooltipContent 
            hideLabel={false}
            formatter={(value, name) => [value, 'Tasks']}
            labelFormatter={(label) => `${label}`}
          />} 
        />

        <PolarAngleAxis 
          dataKey="subject" 
          fontSize={14}
          fontWeight={500}
        />
        <PolarGrid 
          strokeDasharray="3 3"
          stroke="var(--muted-foreground)"
          opacity={0.3}
        />
        <PolarRadiusAxis 
          angle={45} 
          domain={[0, "dataMax + 2"]} 
          fontSize={10}
          tickCount={5}
        />

        <Radar
          name="Tasks"
          dataKey="value"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          strokeWidth={2}
          dot={{
            r: 6,
            fillOpacity: 1,
            fill: "var(--chart-1)",
            stroke: "var(--background)",
            strokeWidth: 2,
          }}
          fillOpacity={0.15}
        />
      </RadarChart>
    </ChartContainer>
  );
};