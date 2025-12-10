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
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import { useYearFilter } from '@/context/year-filter-context';
import { useMemo } from 'react';

type Infraction = {
  id: string;
  date: string;
  type_infraction: string;
};

type InfractionsByTypeChartProps = {
  infractions: Infraction[] | null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


export function InfractionsByTypeChart({ infractions }: InfractionsByTypeChartProps) {
  const { selectedYear } = useYearFilter();

  const chartData = useMemo(() => {
    if (!infractions) {
      return [];
    }

    const typeCounts: { [key: string]: number } = {};

    infractions.forEach((infraction) => {
        try {
            const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
            if (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear) {
                const type = infraction.type_infraction || 'Non défini';
                if (!typeCounts[type]) {
                    typeCounts[type] = 0;
                }
                typeCounts[type]++;
            }
        } catch(e) {
            // Ignore invalid date
        }
    });
    
    return Object.keys(typeCounts).map((type) => ({
        name: type,
        value: typeCounts[type],
    }));
  }, [infractions, selectedYear]);

  const COLORS = {
    'Alarme': 'hsl(var(--chart-1))',
    'Alerte': 'hsl(var(--chart-2))',
    'default': 'hsl(var(--chart-3))'
  };

  const chartConfig = useMemo(() => {
    const config: { [key: string]: { label: string, color: string } } = {};
    chartData.forEach(item => {
        const colorKey = item.name as keyof typeof COLORS;
        config[item.name] = {
            label: item.name,
            color: COLORS[colorKey] || COLORS['default'],
        };
    });
    return config;
  }, [chartData]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des Infractions par Type</CardTitle>
        <CardDescription>
          Répartition des infractions pour {selectedYear === 'all' ? 'toutes les années' : selectedYear}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="value" />} />
            <Pie data={chartData} dataKey="value" nameKey="name" labelLine={false} label={renderCustomizedLabel}>
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                ))}
            </Pie>
            <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="-translate-y-[2rem] flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
        ) : (
          <div className="flex justify-center items-center h-[300px] text-muted-foreground">
            Aucune donnée à afficher.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
