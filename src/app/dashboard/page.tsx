'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Briefcase,
  UserCircle,
  Truck,
  Activity,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useYearFilter } from '@/context/year-filter-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { InfractionsByMonthChart } from '@/components/dashboard/infractions-by-month-chart';
import { InfractionsByTypeChart } from '@/components/dashboard/infractions-by-type-chart';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { PointsLostByDriverChart } from '@/components/dashboard/points-lost-by-driver-chart';
import { PointsLostByInvariantChart } from '@/components/dashboard/points-lost-by-invariant-chart';


// Type definitions
type Partenaire = { id: string; nom: string; actif: boolean };
type Conducteur = { id: string; nom: string; prenom: string; partenaire_id: string; cle_obc_id: string; };
type Vehicule = { id: string; partenaire_id: string; };
type Invariant = { id: string, titre: string };
type Infraction = { id: string; date: string; partenaire_id: string; conducteur_id?: string; type_infraction: string; invariant_id?: string; };
type Scp = { id: string; invariants_id: string; type: string; value: number; };
type Rapport = { 
  id: string; 
  date: string; 
  temps_conduite: string; 
  temps_attente: string; 
  duree: string; 
  partenaire_id: string;
};


function StatCard({ title, value, icon: Icon, description, isLoading }: { title: string, value: string | number, icon: React.ElementType, description?: string, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function RecentInfractions({
  infractions,
  conducteurs,
}: {
  infractions: (Infraction & { conducteurNom?: string })[] | null;
  conducteurs: Conducteur[] | null;
}) {
  const { selectedYear } = useYearFilter();

  const enrichedInfractions = useMemo(() => {
    const driverMap = new Map(
      conducteurs?.map((c) => [c.id, `${c.prenom} ${c.nom}`])
    );
    return infractions
      ?.filter((infraction) => {
        if (selectedYear === 'all') return true;
        try {
            const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
            return !isNaN(infractionDate.getTime()) && infractionDate.getFullYear().toString() === selectedYear;
        } catch { return false; }
      })
      .map((inf) => ({
        ...inf,
        conducteurNom: inf.conducteur_id
          ? driverMap.get(inf.conducteur_id)
          : 'N/A',
      }))
      .sort((a, b) => {
        try {
          const dateA = new Date(a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date).getTime();
          const dateB = new Date(b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      })
      .slice(0, 5);
  }, [infractions, conducteurs, selectedYear]);

  return (
    <div className="space-y-8">
      {enrichedInfractions?.map((infraction) => (
        <div key={infraction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              <AlertTriangle className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {infraction.conducteurNom}
            </p>
            <p className="text-sm text-muted-foreground">
              {infraction.type_infraction}
            </p>
          </div>
          <div className="ml-auto font-medium">{formatDate(infraction.date)}</div>
        </div>
      ))}
      {(!enrichedInfractions || enrichedInfractions.length === 0) && (
        <p className="text-sm text-muted-foreground text-center">Aucune infraction récente.</p>
      )}
    </div>
  );
}


export default function DashboardPage() {
  const firestore = useFirestore();
  const { selectedYear } = useYearFilter();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const activePartnerFilter = useMemo(() => (
    activePartner ? [where('partenaire_id', '==', activePartner.id)] : []
  ), [activePartner]);
  
  const conducteursQuery = useMemoFirebase(() => query(collection(firestore, 'conducteurs'), ...activePartnerFilter), [firestore, activePartnerFilter]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const vehiculesQuery = useMemoFirebase(() => query(collection(firestore, 'vehicules'), ...activePartnerFilter), [firestore, activePartnerFilter]);
  const { data: vehicules, isLoading: isLoadingVehicules } = useCollection<Vehicule>(vehiculesQuery);
    
  const infractionsQuery = useMemoFirebase(() => query(collection(firestore, 'infractions'), ...activePartnerFilter), [firestore, activePartnerFilter]);
  const { data: infractions, isLoading: isLoadingInfractions } = useCollection<Infraction>(infractionsQuery);
  
  const rapportsQuery = useMemoFirebase(() => query(collection(firestore, 'rapports'), ...activePartnerFilter), [firestore, activePartnerFilter]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);
  
  const scpQuery = useMemoFirebase(() => collection(firestore, 'scp'), [firestore]);
  const { data: scpData, isLoading: isLoadingScp } = useCollection<Scp>(scpQuery);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);


  const isLoading = isLoadingPartenaires || isLoadingConducteurs || isLoadingVehicules || isLoadingInfractions || isLoadingRapports || isLoadingScp || isLoadingInvariants;

  const infractionsThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return infractions?.filter(inf => {
        try {
            const infDate = new Date(inf.date.includes('/') ? inf.date.split('/').reverse().join('-') : inf.date);
            return infDate.getMonth() === currentMonth && infDate.getFullYear() === currentYear;
        } catch {
            return false;
        }
    }).length || 0;
  }, [infractions]);

  const conducteursAvecCleCount = useMemo(() => {
    if (!conducteurs) return 0;
    return conducteurs.filter(c => c.cle_obc_id).length;
  }, [conducteurs]);

  if (selectedYear === undefined) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord {activePartner ? `- ${activePartner.nom}` : ''}</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Partenaires" value={partenaires?.length || 0} icon={Briefcase} isLoading={isLoadingPartenaires} description={`${partenaires?.filter(p => p.actif).length || 0} actif(s)`} />
        <StatCard title="Conducteurs avec Clé OBC" value={conducteursAvecCleCount} icon={UserCircle} isLoading={isLoadingConducteurs} description={activePartner ? `Pour ${activePartner.nom}` : 'Total'} />
        <StatCard title="Véhicules" value={vehicules?.length || 0} icon={Truck} isLoading={isLoadingVehicules} description={activePartner ? `Pour ${activePartner.nom}` : 'Total'} />
        <StatCard title="Infractions (ce mois-ci)" value={infractionsThisMonth} icon={Activity} isLoading={isLoadingInfractions} description="Total pour le mois en cours"/>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <div className="col-span-1 lg:col-span-4">
            {isLoadingInfractions ? (
                 <Card className="h-[466px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </Card>
            ) : (
                <InfractionsByMonthChart infractions={infractions} />
            )}
        </div>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Infractions récentes</CardTitle>
            <CardDescription>
              Les 5 dernières infractions enregistrées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentInfractions infractions={infractions} conducteurs={conducteurs} />
          </CardContent>
        </Card>
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {isLoadingRapports ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </Card>
            ))
          ) : (
            <>
              <ActivityChart
                rapports={rapports}
                metric="travail"
                title="Temps de Travail"
              />
              <ActivityChart
                rapports={rapports}
                metric="conduite"
                title="Temps de Conduite"
              />
              <ActivityChart
                rapports={rapports}
                metric="repos"
                title="Temps de Repos"
              />
            </>
          )}
        </div>
       <div className="grid gap-4 md:grid-cols-1">
         <div>
            {isLoadingInfractions ? (
                <Card className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </Card>
            ) : (
                <InfractionsByTypeChart infractions={infractions} />
            )}
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           {isLoading ? (
               <Card className="h-[400px] flex items-center justify-center">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </Card>
           ) : (
               <PointsLostByDriverChart infractions={infractions} conducteurs={conducteurs} scpData={scpData} />
           )}
            {isLoading ? (
                <Card className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </Card>
            ) : (
                <PointsLostByInvariantChart infractions={infractions} invariants={invariants} scpData={scpData} />
            )}
         </div>
      </div>
    </div>
  );
}
