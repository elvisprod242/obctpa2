'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  Briefcase,
  Truck,
  UserCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { useYearFilter } from '@/context/year-filter-context';

type Partenaire = { id: string; nom: string; actif: boolean };
type Conducteur = { id: string; nom: string; prenom: string; partenaire_id: string; cle_obc_id: string; };
type Vehicule = { id: string; partenaire_id: string; };
type Infraction = {
  id: string;
  date: string;
  partenaire_id: string;
  conducteur_id?: string;
  invariant_id?: string;
  type_infraction: string;
};

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

  const partenairesQuery = useMemoFirebase(
    () => collection(firestore, 'partenaires'),
    [firestore]
  );
  const { data: partenaires, isLoading: isLoadingPartenaires } =
    useCollection<Partenaire>(partenairesQuery);

  const conducteursQuery = useMemoFirebase(
    () => collection(firestore, 'conducteurs'),
    [firestore]
  );
  const { data: conducteurs, isLoading: isLoadingConducteurs } =
    useCollection<Conducteur>(conducteursQuery);

  const vehiculesQuery = useMemoFirebase(
    () => collection(firestore, 'vehicules'),
    [firestore]
  );
  const { data: vehicules, isLoading: isLoadingVehicules } =
    useCollection<Vehicule>(vehiculesQuery);
    
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const activePartnerQueryConditions = useMemo(() => (
    activePartner ? [where('partenaire_id', '==', activePartner.id)] : []
  ), [activePartner]);

  const infractionsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'infractions'), ...activePartnerQueryConditions);
  }, [firestore, activePartnerQueryConditions]);
  
  const { data: infractions, isLoading: isLoadingInfractions } =
    useCollection<Infraction>(infractionsQuery);

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
    let filteredConducteurs = conducteurs;
    if (activePartner) {
        filteredConducteurs = conducteurs.filter(c => c.cle_obc_id);
    } else {
        filteredConducteurs = conducteurs.filter(c => c.cle_obc_id);
    }
    return filteredConducteurs.length;
  }, [conducteurs, activePartner]);
  
  const vehiculesCount = useMemo(() => {
    if (!vehicules) return 0;
    if (!activePartner) return vehicules.length;
    return vehicules.filter(v => v.partenaire_id === activePartner.id).length;
  }, [vehicules, activePartner]);

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
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Partenaires
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingPartenaires ? '...' : partenaires?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              dont {partenaires?.filter(p => p.actif).length || 0} actif(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conducteurs avec Clé OBC
            </CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingConducteurs ? '...' : conducteursAvecCleCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {activePartner ? `Pour ${activePartner.nom}` : 'Total des conducteurs avec clé'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingVehicules ? '...' : vehiculesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {activePartner ? `Pour ${activePartner.nom}` : 'Total des véhicules dans la flotte'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Infractions (ce mois-ci)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingInfractions ? '...' : infractionsThisMonth}
            </div>
             <p className="text-xs text-muted-foreground">
              Total pour le mois en cours
            </p>
          </CardContent>
        </Card>
      </div>
       <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Aperçu des Infractions ({selectedYear === 'all' ? 'Toutes années' : selectedYear})</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             {isLoadingInfractions ? (
              <div className="h-[350px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
                <div className="h-[350px] w-full flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                    Les données du graphique ne sont pas disponibles pour le moment.
                </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}