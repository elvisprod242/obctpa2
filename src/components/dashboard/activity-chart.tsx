'use client';

import * as React from 'react';
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
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Legend } from 'recharts';
import { useYearFilter } from '@/context/year-filter-context';

type Rapport = {
  id: string;
  date: string;
  temps_conduite: string; // "hh:mm:ss"
  temps_attente: string; // Temps de repos
  duree: string; // Temps de travail
};

type Metric = 'travail' | 'conduite' | 'repos';

type ActivityChartProps = {
  rapports: Rapport[] | null;
  metric: Metric;
  title: string;
};

// Helper function to parse "hh:mm:ss" into total hours
const parseTimeToHours = (timeString: string | null | undefined): number => {
  if (!timeString || typeof timeString !== 'string') return 0;
  const parts = timeString.split(':').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [hours, minutes, seconds] = parts;
  return hours + minutes / 60 + seconds / 3600;
};

export function ActivityChart({ rapports, metric, title }: ActivityChartProps) {
  const { selectedYear } = useYearFilter();

  const chartData = React.useMemo(() => {
    const monthLabels = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
    ];

    const monthlyData: { [key: string]: { [key in Metric]: number } } = {};
    monthLabels.forEach(label => {
        monthlyData[label] = { travail: 0, conduite: 0, repos: 0 };
    });

    rapports?.forEach((rapport) => {
        try {
            const rapportDate = new Date(rapport.date.includes('/') ? rapport.date.split('/').reverse().join('-') : rapport.date);
            if (selectedYear === 'all' || rapportDate.getFullYear().toString() === selectedYear) {
                const monthName = monthLabels[rapportDate.getMonth()];
                if (monthName) {
                    monthlyData[monthName].travail += parseTimeToHours(rapport.duree);
                    monthlyData[monthName].conduite += parseTimeToHours(rapport.temps_conduite);
                    monthlyData[monthName].repos += parseTimeToHours(rapport.temps_attente);
                }
            }
        } catch (e) {
            // Ignore invalid dates
        }
    });

    return monthLabels.map((month) => ({
      month,
      value: Math.round(monthlyData[month][metric]),
    }));
  }, [rapports, selectedYear, metric]);

  const chartConfig = {
    value: { label: title, color: `hsl(var(--chart-${metric === 'travail' ? 1 : metric === 'conduite' ? 2 : 3}))` },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} (en heures)</CardTitle>
        <CardDescription>Cumul mensuel pour {selectedYear === 'all' ? 'toutes les années' : selectedYear}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="value" fill="var(--color-value)" radius={4}>
                <LabelList position="top" offset={5} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
