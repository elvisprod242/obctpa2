'use client';

import {
  deleteDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Search,
  UserCircle,
  Eye,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

type ConducteurFormValues = {
  nom: string;
  prenom: string;
  numero_permis: string;
  categorie_permis: string;
  cle_obc_id: string;
  lieu_travail: string;
};

type Partenaire = { id: string; nom: string; actif: boolean };
type CleOBC = { id: string; cle_obc: string; partenaire_id: string; };
type Conducteur = ConducteurFormValues & { id: string, cle_obc?: string };

function ConducteurForm({
  conducteur,
  onFinished,
  clesOBC
}: {
  conducteur?: Conducteur;
  onFinished: () => void;
  clesOBC: CleOBC[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const conducteursCollection = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'),[firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const [formValues, setFormValues] = useState<ConducteurFormValues>(
    conducteur || {
      nom: '',
      prenom: '',
      numero_permis: '',
      categorie_permis: '',
      cle_obc_id: '',
      lieu_travail: '',
    }
  );

  useEffect(() => {
    setFormValues(conducteur || {
        nom: '',
        prenom: '',
        numero_permis: '',
        categorie_permis: '',
        cle_obc_id: '',
        lieu_travail: '',
      })
  }, [conducteur]);


  const handleChange = (field: keyof ConducteurFormValues, value: string) => {
    setFormValues(prev => ({...prev, [field]: value}));
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const dataToSave: Partial<ConducteurFormValues> = { ...formValues };

    try {
      if (conducteur) {
        const docRef = doc(conducteursCollection, conducteur.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Conducteur mis à jour.' });
      } else {
        addDocumentNonBlocking(conducteursCollection, dataToSave);
        toast({ title: 'Succès', description: 'Conducteur ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving driver: ', error);
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
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" placeholder="Dupont" value={formValues.nom} onChange={e => handleChange('nom', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" placeholder="Jean" value={formValues.prenom} onChange={e => handleChange('prenom', e.target.value)} />
            </div>
        </div>
        <div className="space-y-2">
              <Label htmlFor="numero_permis">Numéro de permis</Label>
              <Input id="numero_permis" placeholder="123456789" value={formValues.numero_permis} onChange={e => handleChange('numero_permis', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="categorie_permis">Catégorie</Label>
                <Input id="categorie_permis" placeholder="C" value={formValues.categorie_permis} onChange={e => handleChange('categorie_permis', e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label>Clé OBC</Label>
                <Select onValueChange={value => handleChange('cle_obc_id', value)} value={formValues.cle_obc_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une clé OBC" />
                    </SelectTrigger>
                  <SelectContent>
                    {clesOBC?.filter(c => activePartner && c.partenaire_id === activePartner.id).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.cle_obc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </div>
        <div className="space-y-2">
              <Label htmlFor="lieu_travail">Lieu de travail</Label>
              <Input id="lieu_travail" placeholder="Paris" value={formValues.lieu_travail} onChange={e => handleChange('lieu_travail', e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {conducteur ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
  );
}

function ConducteurActions({ conducteur, clesOBC }: { conducteur: Conducteur; clesOBC: CleOBC[] | null; }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'conducteurs', conducteur.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Conducteur supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le conducteur</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du conducteur.
            </DialogDescription>
          </DialogHeader>
          <ConducteurForm
            conducteur={conducteur}
            onFinished={() => setIsEditDialogOpen(false)}
            clesOBC={clesOBC}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le conducteur sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TooltipProvider>
        <div className="flex items-center justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="default" size="icon" asChild>
                    <Link href={`/dashboard/conducteurs/${conducteur.id}`}>
                        <Eye className="h-4 w-4" />
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Détails</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Modifier</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Supprimer</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}

function ConducteurCard({ conducteur, clesOBC }: { conducteur: Conducteur; clesOBC: CleOBC[] | null; }) {
  return (
    <Card className="rounded-xl flex flex-col h-full transition-colors">
        <CardHeader>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <CardTitle className="text-2xl font-bold truncate">{conducteur.prenom} {conducteur.nom}</CardTitle>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
            <p><strong>Permis:</strong> {conducteur.numero_permis} ({conducteur.categorie_permis})</p>
             <div className="flex items-center gap-2">
              <strong>Clé OBC:</strong>
              {conducteur.cle_obc && conducteur.cle_obc !== 'N/A' ? (
                <Badge className="bg-green-600 hover:bg-green-700">{conducteur.cle_obc}</Badge>
              ) : (
                <Badge variant="destructive">Aucune</Badge>
              )}
            </div>
            <p><strong>Lieu:</strong> {conducteur.lieu_travail}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <ConducteurActions conducteur={conducteur} clesOBC={clesOBC}/>
        </CardFooter>
    </Card>
  );
}

export default function ConducteursPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);
  
  const clesOBCQuery = useMemoFirebase(
    () => collection(firestore, 'cles_obc'),
    [firestore]
  );
  const { data: clesOBC, isLoading: isLoadingClesOBC } = useCollection<CleOBC>(clesOBCQuery);

  const isLoading = isLoadingConducteurs || isLoadingClesOBC;
  
  const enrichedConducteurs = useMemo(() => {
    if (!conducteurs || !clesOBC) return [];
    const cleOBCMap = new Map(clesOBC.map(c => [c.id, c.cle_obc]));
    return conducteurs.map(c => ({
      ...c,
      cle_obc: cleOBCMap.get(c.cle_obc_id) || 'N/A'
    }));
  }, [conducteurs, clesOBC]);

  const filteredConducteurs = useMemo(() => {
    return enrichedConducteurs?.filter((c) => 
      `${c.prenom} ${c.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedConducteurs, searchTerm]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentConducteurs = filteredConducteurs?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredConducteurs
    ? Math.ceil(filteredConducteurs.length / itemsPerPage)
    : 0;
    
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Conducteurs</h2>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Conducteur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Conducteur</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau conducteur à votre liste.
                </DialogDescription>
              </DialogHeader>
              <ConducteurForm
                  onFinished={() => setIsCreateDialogOpen(false)}
                  clesOBC={clesOBC}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setView('grid')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vue Grille</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={view === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setView('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Vue Liste</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !filteredConducteurs || filteredConducteurs.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun conducteur trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucun conducteur ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre premier conducteur pour le voir apparaître ici.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Conducteur
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConducteurs.map((conducteur) => (
            <ConducteurCard
              key={conducteur.id}
              conducteur={conducteur}
              clesOBC={clesOBC}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <UserCircle className="h-4 w-4 inline-block" />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>N° Permis</TableHead>
                <TableHead>Clé OBC</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentConducteurs?.map((conducteur) => (
                <TableRow key={conducteur.id}>
                    <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-muted/80">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/dashboard/conducteurs/${conducteur.id}`} className="hover:underline">
                            {conducteur.prenom} {conducteur.nom}
                        </Link>
                    </TableCell>
                    <TableCell>{conducteur.numero_permis}</TableCell>
                    <TableCell>
                      {conducteur.cle_obc && conducteur.cle_obc !== 'N/A' ? (
                        <Badge className="bg-green-600 hover:bg-green-700">{conducteur.cle_obc}</Badge>
                      ) : (
                        <Badge variant="destructive">Aucune</Badge>
                      )}
                    </TableCell>
                    <TableCell>{conducteur.lieu_travail}</TableCell>
                    <TableCell className="text-right">
                        <ConducteurActions
                          conducteur={conducteur}
                          clesOBC={clesOBC}
                        />
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-4 py-4 pr-4">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Lignes par page</p>
                <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                    }}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            { totalPages > 1 &&
                <div className="flex items-center space-x-2">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    >
                    Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                    </span>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    >
                    Suivant
                    </Button>
                </div>
            }
          </div>
        </Card>
      )}
    </div>
  );
}
