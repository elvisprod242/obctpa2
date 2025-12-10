'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useYearFilter } from '@/context/year-filter-context';
import * as React from 'react';

type Infraction = {
  id: string;
  date: string;
};

type InfractionsByMonthChartProps = {
  infractions: Infraction[] | null;
};

export function InfractionsByMonthChart({ infractions }: InfractionsByMonthChartProps) {
  const { selectedYear } = useYearFilter();

  const chartData = React.useMemo(() => {
    if (!infractions) {
      return [];
    }
    
    const monthLabels = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
    ];
    
    const monthlyCounts: { [key: string]: number } = {};
    monthLabels.forEach(label => {
        monthlyCounts[label] = 0;
    });

    infractions.forEach((infraction) => {
      try {
        const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
        if (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear) {
          const monthName = monthLabels[infractionDate.getMonth()];
          if (monthName) {
            monthlyCounts[monthName]++;
          }
        }
      } catch (e) {
        // Ignore invalid dates
      }
    });

    return monthLabels.map((month) => ({
      month,
      infractions: monthlyCounts[month],
    }));
  }, [infractions, selectedYear]);

  const chartConfig = {
    infractions: {
      label: 'Infractions',
      color: 'hsl(var(--destructive))',
    },
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Aperçu des Infractions ({selectedYear === 'all' ? 'Toutes années' : selectedYear})</CardTitle>
            <CardDescription>Nombre d'infractions par mois.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <YAxis allowDecimals={false}/>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                    dataKey="infractions"
                    fill="var(--color-infractions)"
                    radius={4}
                >
                    <LabelList position="top" offset={5} className="fill-foreground" fontSize={12} />
                </Bar>
            </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
