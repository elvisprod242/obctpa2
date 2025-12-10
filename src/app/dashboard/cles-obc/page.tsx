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
  Search,
  KeyRound,
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
import { Label } from '@/components/ui/label';

type CleOBCFormValues = {
  cle_obc: string;
  partenaire_id: string;
};

type CleOBC = CleOBCFormValues & { id: string };
type Partenaire = { id: string; nom: string; actif: boolean };

function CleOBCForm({
  cleOBC,
  onFinished,
  activePartnerId,
}: {
  cleOBC?: CleOBC;
  onFinished: () => void;
  activePartnerId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const clesOBCCollection = useMemoFirebase(() => collection(firestore, 'cles_obc'), [firestore]);
  const [cleObcValue, setCleObcValue] = useState(cleOBC?.cle_obc || '');

  useEffect(() => {
    setCleObcValue(cleOBC?.cle_obc || '');
  }, [cleOBC]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const dataToSave = { cle_obc: cleObcValue, partenaire_id: activePartnerId };

    try {
      if (cleOBC) {
        const docRef = doc(clesOBCCollection, cleOBC.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Clé OBC mise à jour.' });
      } else {
        addDocumentNonBlocking(clesOBCCollection, dataToSave);
        toast({ title: 'Succès', description: 'Clé OBC ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving OBC key: ', error);
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
            <Label htmlFor="cle_obc">Clé OBC</Label>
            <Input id="cle_obc" placeholder="OBC_12345" value={cleObcValue} onChange={(e) => setCleObcValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {cleOBC ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
  );
}

function CleOBCActions({ cleOBC, activePartnerId }: { cleOBC: CleOBC; activePartnerId: string; }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'cles_obc', cleOBC.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Clé OBC supprimée.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Clé OBC</DialogTitle>
          </DialogHeader>
          <CleOBCForm
            cleOBC={cleOBC}
            onFinished={() => setIsEditDialogOpen(false)}
            activePartnerId={activePartnerId}
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
              Cette action est irréversible. La clé sera définitivement
              supprimée.
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

export default function ClesOBCPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const clesOBCQuery = useMemoFirebase(
    () => activePartner ? query(collection(firestore, 'cles_obc'), where('partenaire_id', '==', activePartner.id)) : null,
    [firestore, activePartner]
  );

  const { data: clesOBC, isLoading: isLoadingClesOBC } =
    useCollection<CleOBC>(clesOBCQuery);

  const isLoading = isLoadingClesOBC || isLoadingPartenaires;

  const filteredCles = useMemo(() => {
    return clesOBC?.filter((c) =>
      c.cle_obc.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clesOBC, searchTerm]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentCles = filteredCles?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredCles
    ? Math.ceil(filteredCles.length / itemsPerPage)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h4 className="text-xl font-semibold tracking-tight">Gestion des Clés OBC</h4>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Clé OBC
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Clé OBC</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle clé OBC pour le partenaire actif.
                </DialogDescription>
              </DialogHeader>
              {activePartner && (
                <CleOBCForm
                    onFinished={() => setIsCreateDialogOpen(false)}
                    activePartnerId={activePartner.id}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par clé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
              disabled={!activePartner}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !activePartner ? (
         <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun partenaire actif</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            Veuillez activer un partenaire pour gérer les clés OBC.
          </p>
        </div>
      ) : !filteredCles || filteredCles.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucune clé OBC trouvée</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucune clé ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre première clé OBC.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle Clé OBC
          </Button>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clé OBC</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCles?.map((cle) => (
                <TableRow key={cle.id}>
                    <TableCell className="font-medium">
                       <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-muted-foreground" />
                        {cle.cle_obc}
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <CleOBCActions cleOBC={cle} activePartnerId={activePartner.id} />
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
                    {[10, 20, 30, 40, 50].map((pageSize) => (
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

    