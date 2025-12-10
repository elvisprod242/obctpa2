'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, query, where, doc } from 'firebase/firestore';
import { Loader2, Edit, Printer, BedDouble } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format as formatDateFns,
  setYear,
  setMonth,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useYearFilter } from '@/context/year-filter-context';
import { useMonthFilter } from '@/context/month-filter-context';
import { MonthFilter } from '@/components/dashboard/month-filter';
import { formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';

type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = {
  id: string;
  date: string;
  jour: string;
  conducteur_id?: string;
  heure_debut_trajet: string;
  heure_fin_trajet: string;
  temps_attente: string; // "hh:mm:ss"
};
type Conducteur = { id: string; nom: string; prenom: string };
type Objectif = { id: string; invariant_id: string; cible: number; unite: string, chapitre: string, frequence: string, partenaire_id: string };
type TempsRepos = { id: string; rapports_id: string; analyse_cause: string; action_prise: string; suivi: string };
type Invariant = { id: string; titre: string };

type EnrichedReport = Rapport & {
  objectif: string;
  tempsRepos: TempsRepos | undefined;
};

type WeeklyAnalysis = {
  weekLabel: string;
  reports: EnrichedReport[];
  subTotalSeconds: number;
};

type TempsReposFormValues = {
    analyse_cause: string;
    action_prise: string;
    suivi: string;
};

function TempsReposForm({
  tempsRepos,
  rapportId,
  objectifId,
  onFinished,
}: {
  tempsRepos?: TempsRepos;
  rapportId: string;
  objectifId: string;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const tempsReposCollection = useMemoFirebase(() => collection(firestore, 'temps_repos'), [firestore]);
  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const [formValues, setFormValues] = useState<TempsReposFormValues>(tempsRepos || {
    analyse_cause: '',
    action_prise: '',
    suivi: '',
  });

  const handleChange = (field: keyof TempsReposFormValues, value: string) => {
    setFormValues(prev => ({...prev, [field]: value}));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucun partenaire actif."});
        return;
    }
    setIsLoading(true);
    try {
      const dataToSave = {
        ...formValues,
        partenaire_id: activePartner.id,
        rapports_id: rapportId,
        objectifs_id: objectifId
      };
      if (tempsRepos) {
        const docRef = doc(tempsReposCollection, tempsRepos.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Analyse mise à jour.' });
      } else {
        addDocumentNonBlocking(tempsReposCollection, dataToSave);
        toast({ title: 'Succès', description: 'Analyse ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="analyse_cause">Analyse de cause</Label>
            <Input id="analyse_cause" placeholder="Pause déjeuner" value={formValues.analyse_cause} onChange={e => handleChange('analyse_cause', e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="action_prise">Action prise</Label>
            <Input id="action_prise" placeholder="Aucune" value={formValues.action_prise} onChange={e => handleChange('action_prise', e.target.value)} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="suivi">Suivi</Label>
            <Input id="suivi" placeholder="Aucun" value={formValues.suivi} onChange={e => handleChange('suivi', e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
    </form>
  );
}


function parseTimeString(time: string): number {
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':').map(Number);
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts;
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds)) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`;
}

export default function TempsReposPage() {
  const firestore = useFirestore();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const { selectedYear } = useYearFilter();
  const { selectedMonth } = useMonthFilter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<EnrichedReport | null>(null);
  
  const [reposObjectifId, setReposObjectifId] = useState<string>('');


  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find((p) => p.actif), [partenaires]);

  const rapportsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'rapports'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const objectifsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'objectifs'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: objectifs, isLoading: isLoadingObjectifs } = useCollection<Objectif>(objectifsQuery);
  
  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);

  const tempsReposQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'temps_repos'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: tempsReposData, isLoading: isLoadingTempsRepos } = useCollection<TempsRepos>(tempsReposQuery);

  const isLoading = isLoadingPartenaires || isLoadingRapports || isLoadingConducteurs || isLoadingObjectifs || isLoadingInvariants || isLoadingTempsRepos;

  const { weeklyData: driverAnalysisData, monthlyTotalSeconds } = useMemo(() => {
    if (!rapports || !selectedDriverId || !objectifs || !tempsReposData || !invariants || !activePartner) return { weeklyData: [], monthlyTotalSeconds: 0 };

    let targetDate = new Date();
    if (selectedYear !== 'all') {
      targetDate = setYear(targetDate, parseInt(selectedYear, 10));
    }
    targetDate = setMonth(targetDate, parseInt(selectedMonth, 10) - 1);

    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const tempsReposMap = new Map(tempsReposData.map(tt => [tt.rapports_id, tt]));
    const tempsReposInvariant = invariants.find(i => i.titre === 'Temps de repos');
    const reposObjectif = tempsReposInvariant 
        ? objectifs.find(o => o.invariant_id === tempsReposInvariant.id && o.partenaire_id === activePartner.id && o.frequence === 'Journalier') 
        : undefined;

    if (reposObjectif) {
        setReposObjectifId(reposObjectif.id);
    }

    const driverMonthlyReports = rapports
      .filter((r) => {
        if (r.conducteur_id !== selectedDriverId) return false;
        try {
          const reportDate = new Date(r.date.includes('/') ? r.date.split('/').reverse().join('-') : r.date);
          return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
        } catch { return false; }
      })
      .map(r => ({
        ...r,
        objectif: reposObjectif ? `${reposObjectif.cible} ${reposObjectif.unite}` : 'N/A',
        tempsRepos: tempsReposMap.get(r.id),
      }));

    const weeklyData: { [weekStart: string]: WeeklyAnalysis } = {};
    let totalSecondsForMonth = 0;

    for (const report of driverMonthlyReports) {
      try {
        const reportDate = new Date(report.date.includes('/') ? report.date.split('/').reverse().join('-') : report.date);
        const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 });
        const weekKey = formatDateFns(weekStart, 'yyyy-MM-dd');

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            weekLabel: `Semaine du ${formatDateFns(weekStart, 'dd MMMM', { locale: fr })} au ${formatDateFns(weekEnd, 'dd MMMM yyyy', { locale: fr })}`,
            reports: [],
            subTotalSeconds: 0,
          };
        }
        
        const reportSeconds = parseTimeString(report.temps_attente);
        weeklyData[weekKey].reports.push(report);
        weeklyData[weekKey].subTotalSeconds += reportSeconds;
        totalSecondsForMonth += reportSeconds;

      } catch { /* ignore invalid dates */ }
    }

    return { weeklyData: Object.values(weeklyData).sort((a, b) => a.reports[0].date.localeCompare(b.reports[0].date)), monthlyTotalSeconds: totalSecondsForMonth };
  }, [rapports, selectedDriverId, selectedYear, selectedMonth, objectifs, tempsReposData, invariants, activePartner]);
  
  const handleEditClick = (report: EnrichedReport) => {
    setCurrentReport(report);
    setIsFormOpen(true);
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area-repos, #printable-area-repos * {
              visibility: visible;
            }
            #printable-area-repos {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
                display: none;
            }
          }
        `}
      </style>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mettre à jour l'analyse</DialogTitle>
                <DialogDescription>
                    Modifier l'analyse pour le rapport du {currentReport ? formatDate(currentReport.date) : ''}.
                </DialogDescription>
            </DialogHeader>
            {currentReport && (
                <TempsReposForm 
                    tempsRepos={currentReport.tempsRepos}
                    rapportId={currentReport.id}
                    objectifId={reposObjectifId}
                    onFinished={() => setIsFormOpen(false)}
                />
            )}
        </DialogContent>
      </Dialog>
      
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Analyse des Temps de Repos</CardTitle>
          <CardDescription>
            Sélectionnez un chauffeur et une période pour voir le détail de son temps de repos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {isLoadingConducteurs ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Select onValueChange={(value) => setSelectedDriverId(value)} value={selectedDriverId || ''}>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Sélectionnez un chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {conducteurs?.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.prenom} {driver.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <MonthFilter />
          </div>
           <Button onClick={handlePrint} variant="outline" disabled={!selectedDriverId || driverAnalysisData.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
            </Button>
        </CardContent>
      </Card>

    <div id="printable-area-repos">
      {isLoading && (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!activePartner && !isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Aucun partenaire actif</h3>
            <p className="text-sm text-muted-foreground">Veuillez activer un partenaire pour commencer.</p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && !selectedDriverId && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8 no-print">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Aucun chauffeur sélectionné</h3>
            <p className="text-sm text-muted-foreground">Veuillez sélectionner un chauffeur dans la liste.</p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && selectedDriverId && (
        <div className="space-y-6">
          {driverAnalysisData.length > 0 ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Temps de Repos Mensuel
                  </CardTitle>
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatTime(monthlyTotalSeconds)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total des heures de repos pour la période sélectionnée.
                  </p>
                </CardContent>
              </Card>
              {driverAnalysisData.map((weekly, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base font-bold">{weekly.weekLabel}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Jour</TableHead>
                        <TableHead>Début trajet</TableHead>
                        <TableHead>Fin trajet</TableHead>
                        <TableHead>Temps de repos</TableHead>
                        <TableHead>Objectif</TableHead>
                        <TableHead>Analyse de cause</TableHead>
                        <TableHead>Action prise</TableHead>
                        <TableHead>Suivi</TableHead>
                        <TableHead className="text-right no-print">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weekly.reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{formatDate(report.date)}</TableCell>
                          <TableCell>{report.jour}</TableCell>
                          <TableCell>{report.heure_debut_trajet}</TableCell>
                          <TableCell>{report.heure_fin_trajet}</TableCell>
                          <TableCell className="font-mono">{report.temps_attente}</TableCell>
                          <TableCell>{report.objectif}</TableCell>
                          <TableCell>{report.tempsRepos?.analyse_cause || '-'}</TableCell>
                          <TableCell>{report.tempsRepos?.action_prise || '-'}</TableCell>
                          <TableCell>{report.tempsRepos?.suivi || '-'}</TableCell>
                          <TableCell className="text-right no-print">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(report)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Modifier l'analyse</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-bold">Sous-total:</TableCell>
                        <TableCell className="font-mono font-bold text-center">{formatTime(weekly.subTotalSeconds)}</TableCell>
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
            }
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">Aucune donnée</h3>
                <p className="text-sm text-muted-foreground">Aucun rapport de repos trouvé pour ce chauffeur pour la période sélectionnée.</p>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
