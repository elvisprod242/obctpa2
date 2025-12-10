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

type Infraction = { id: string; date: string; conducteur_id?: string; type_infraction: string; invariant_id?: string };
type Conducteur = { id: string; nom: string; prenom: string; };
type Scp = { id: string; invariants_id: string; type: string; value: number };

type PointsLostByDriverChartProps = {
  infractions: Infraction[] | null;
  conducteurs: Conducteur[] | null;
  scpData: Scp[] | null;
};

export function PointsLostByDriverChart({ infractions, conducteurs, scpData }: PointsLostByDriverChartProps) {
  const { selectedYear } = useYearFilter();

  const chartData = React.useMemo(() => {
    if (!infractions || !conducteurs || !scpData) {
      return [];
    }
    
    const scpMap = new Map(scpData.map(rule => [`${rule.invariants_id}-${rule.type}`.toLowerCase(), rule.value]));
    const driverPoints: { [key: string]: { name: string, points: number } } = {};

    conducteurs.forEach(driver => {
        driverPoints[driver.id] = { name: `${driver.prenom} ${driver.nom}`, points: 0 };
    });

    infractions.forEach((infraction) => {
        if (!infraction.conducteur_id) return;
        try {
            const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
            if (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear) {
                const ruleKey = `${infraction.invariant_id}-${infraction.type_infraction}`.toLowerCase();
                const pointsLost = scpMap.get(ruleKey) || 0;
                
                if (driverPoints[infraction.conducteur_id]) {
                    driverPoints[infraction.conducteur_id].points += pointsLost;
                }
            }
        } catch (e) {
            // Ignore invalid dates
        }
    });

    return Object.values(driverPoints)
        .filter(driver => driver.points > 0)
        .sort((a,b) => b.points - a.points);

  }, [infractions, conducteurs, scpData, selectedYear]);

  const chartConfig = {
    points: {
      label: 'Points Perdus',
      color: 'hsl(var(--destructive))',
    },
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Points Perdus par Conducteur ({selectedYear === 'all' ? 'Toutes années' : selectedYear})</CardTitle>
            <CardDescription>Total des points perdus pour chaque conducteur.</CardDescription>
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
                    width={120}
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
