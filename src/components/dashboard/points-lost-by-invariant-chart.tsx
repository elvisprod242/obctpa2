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
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useYearFilter } from '@/context/year-filter-context';

type Infraction = { id: string; date: string; type_infraction: string; invariant_id?: string };
type Invariant = { id: string; titre: string; };
type Scp = { id: string; invariants_id: string; type: string; value: number };

type PointsLostByInvariantChartProps = {
  infractions: Infraction[] | null;
  invariants: Invariant[] | null;
  scpData: Scp[] | null;
};

export function PointsLostByInvariantChart({ infractions, invariants, scpData }: PointsLostByInvariantChartProps) {
  const { selectedYear } = useYearFilter();

  const chartData = React.useMemo(() => {
    if (!infractions || !invariants || !scpData) {
      return [];
    }
    
    const scpMap = new Map(scpData.map(rule => [`${rule.invariants_id}-${rule.type}`.toLowerCase(), rule.value]));
    const invariantPoints: { [key: string]: { name: string, points: number } } = {};

    invariants.forEach(invariant => {
        invariantPoints[invariant.id] = { name: invariant.titre, points: 0 };
    });

    infractions.forEach((infraction) => {
        if (!infraction.invariant_id) return;
        try {
            const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
            if (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear) {
                const ruleKey = `${infraction.invariant_id}-${infraction.type_infraction}`.toLowerCase();
                const pointsLost = scpMap.get(ruleKey) || 0;
                
                if (invariantPoints[infraction.invariant_id]) {
                    invariantPoints[infraction.invariant_id].points += pointsLost;
                }
            }
        } catch (e) {
            // Ignore invalid dates
        }
    });

    return Object.values(invariantPoints)
        .filter(invariant => invariant.points > 0)
        .sort((a,b) => b.points - a.points);

  }, [infractions, invariants, scpData, selectedYear]);

  const chartConfig = {
    points: {
      label: 'Points Perdus',
      color: 'hsl(var(--destructive))',
    },
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Points Perdus par Invariant ({selectedYear === 'all' ? 'Toutes années' : selectedYear})</CardTitle>
            <CardDescription>Total des points perdus pour chaque type d'invariant.</CardDescription>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[350px] w-full">
            <BarChart data={chartData} accessibilityLayer layout="vertical">
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    width={150}
                    // Truncate long labels
                    tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                />
                <XAxis type="number" dataKey="points" />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                    dataKey="points"
                    fill="var(--color-points)"
                    radius={4}
                >
                    <LabelList position="right" offset={5} className="fill-foreground" fontSize={12} />
                </Bar>
            </BarChart>
            </ChartContainer>
        </CardContent>
    </Card>
  );
}
