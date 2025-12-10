'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 6) {
        setError('Le mot de passe doit comporter au moins 6 caractères.');
        setIsLoading(false);
        return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = 'Une erreur inconnue est survenue.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Cet e-mail est déjà enregistré. Veuillez vous connecter.';
      } else {
        errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Échec de l\'inscription',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
            <Logo variant="auth" />
          </div>
          <CardTitle className="text-2xl font-headline">Créer un compte</CardTitle>
          <CardDescription>Entrez votre e-mail et votre mot de passe pour commencer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                    id="email"
                    placeholder="nom@exemple.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                    id="password"
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
             </div>
             {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              S'inscrire
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Vous avez déjà un compte?{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
