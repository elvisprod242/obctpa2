'use client';

import { useMemo, useState, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import {
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Label } from './ui/label';

// Simplified form values without Zod
export type InfractionFormValues = {
  date: string;
  rapports_id?: string;
  conducteur_id?: string;
  invariant_id?: string;
  type_infraction: string;
  nombre: number;
  mesure_disciplinaire?: string;
  autres_mesures_disciplinaire?: string;
  suivi: boolean;
  amelioration: boolean;
  date_suivi?: string;
};

type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = {
  id: string;
  date: string;
  conducteur_id?: string;
  conducteurNomComplet?: string;
};
type Conducteur = { id: string; nom: string; prenom: string };
type Invariant = { id: string; titre: string };
type Infraction = InfractionFormValues & { id: string };

type InfractionFormProps = {
  infraction?: Infraction;
  onFinished: () => void;
  partenaires: Partenaire[] | null;
  rapports: Rapport[] | null;
  conducteurs: Conducteur[] | null;
  invariants: Invariant[] | null;
  initialValues?: Partial<InfractionFormValues>;
};

export function InfractionForm({
  infraction,
  onFinished,
  partenaires,
  rapports,
  conducteurs,
  invariants,
  initialValues,
}: InfractionFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const infractionsCollection = useMemoFirebase(
    () => collection(firestore, 'infractions'),
    [firestore]
  );
  
  const [formValues, setFormValues] = useState<InfractionFormValues>(() => {
    const defaults = {
        date: new Date().toISOString().split('T')[0],
        rapports_id: '',
        conducteur_id: '',
        invariant_id: '',
        type_infraction: 'Alerte',
        nombre: 1,
        mesure_disciplinaire: '',
        autres_mesures_disciplinaire: '',
        suivi: false,
        amelioration: false,
        date_suivi: '',
    };
    return { ...defaults, ...infraction, ...initialValues };
  });

  const activePartner = useMemo(() => partenaires?.find((p) => p.actif), [
    partenaires,
  ]);
  
  useEffect(() => {
    const defaults = {
        date: new Date().toISOString().split('T')[0],
        rapports_id: '',
        conducteur_id: '',
        invariant_id: '',
        type_infraction: 'Alerte',
        nombre: 1,
        mesure_disciplinaire: '',
        autres_mesures_disciplinaire: '',
        suivi: false,
        amelioration: false,
        date_suivi: '',
    };
    setFormValues({ ...defaults, ...infraction, ...initialValues });
  }, [infraction, initialValues]);

  const handleChange = (field: keyof InfractionFormValues, value: any) => {
    setFormValues(prev => ({...prev, [field]: value}));
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartner) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Aucun partenaire actif sélectionné.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave: any = { ...formValues, partenaire_id: activePartner.id };

      Object.keys(dataToSave).forEach((key) => {
        const typedKey = key as keyof typeof dataToSave;
        if (dataToSave[typedKey] === 'none') {
          dataToSave[typedKey] = '';
        }
      });
      dataToSave.nombre = Number(dataToSave.nombre);


      if (infraction) {
        const docRef = doc(infractionsCollection, infraction.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Infraction mise à jour.' });
      } else {
        addDocumentNonBlocking(infractionsCollection, dataToSave);
        toast({ title: 'Succès', description: 'Infraction ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving infraction: ', error);
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
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="date">Date de l'infraction</Label>
                <Input type="date" id="date" value={formValues.date} onChange={e => handleChange('date', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conducteur</Label>
                <Select onValueChange={value => handleChange('conducteur_id', value)} value={formValues.conducteur_id || 'none'}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un conducteur" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {conducteurs?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Invariant</Label>
                <Select onValueChange={value => handleChange('invariant_id', value)} value={formValues.invariant_id || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un invariant" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {invariants?.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Type d'infraction</Label>
                    <Select onValueChange={value => handleChange('type_infraction', value)} value={formValues.type_infraction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Alerte">Alerte</SelectItem>
                            <SelectItem value="Alarme">Alarme</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" type="number" value={formValues.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                </div>
            </div>
            
             <div className="space-y-2">
                <Label htmlFor="mesure_disciplinaire">Mesure disciplinaire</Label>
                <Input id="mesure_disciplinaire" type="text" placeholder="Avertissement écrit..." value={formValues.mesure_disciplinaire} onChange={e => handleChange('mesure_disciplinaire', e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="autres_mesures_disciplinaire">Autres mesures</Label>
                <Input
                    id="autres_mesures_disciplinaire"
                    type="text"
                    placeholder="Formation complémentaire..."
                    value={formValues.autres_mesures_disciplinaire} 
                    onChange={e => handleChange('autres_mesures_disciplinaire', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <Label>Suivi nécessaire ?</Label>
                <Switch
                    checked={formValues.suivi}
                    onCheckedChange={checked => handleChange('suivi', checked)}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-3">
                <Label>Amélioration constatée ?</Label>
                <Switch
                    checked={formValues.amelioration}
                    onCheckedChange={checked => handleChange('amelioration', checked)}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="date_suivi">Date de suivi</Label>
                <Input id="date_suivi" type="date" value={formValues.date_suivi} onChange={e => handleChange('date_suivi', e.target.value)} />
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !activePartner}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {infraction ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
  );
}
