
'use client';

import * as React from 'react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type UserProfile = {
  id: string;
  email: string;
  registrationDate: string;
};

export default function ProfilPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPasswordChangeLoading, setIsPasswordChangeLoading] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errors, setErrors] = React.useState({currentPassword: '', newPassword: '', confirmPassword: ''});

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = {currentPassword: '', newPassword: '', confirmPassword: ''};

    if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
        hasError = true;
    }
    if(newPassword.length < 6) {
        newErrors.newPassword = 'Le nouveau mot de passe doit comporter au moins 6 caractères.';
        hasError = true;
    }

    if(hasError){
        setErrors(newErrors);
        return;
    }


    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non trouvé.' });
      return;
    }
    setIsPasswordChangeLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast({ title: 'Succès', description: 'Votre mot de passe a été modifié.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({currentPassword: '', newPassword: '', confirmPassword: ''});
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Le mot de passe actuel est incorrect.';
        setErrors(prev => ({...prev, currentPassword: errorMessage}));
      } else {
        errorMessage = "Impossible de mettre à jour le mot de passe. Veuillez réessayer.";
        toast({ variant: 'destructive', title: 'Erreur', description: errorMessage });
      }
    } finally {
      setIsPasswordChangeLoading(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full gap-6">
       <h2 className="text-3xl font-bold tracking-tight">Mon Profil</h2>
      <div className="flex justify-center items-start pt-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            {isLoading ? (
                <Skeleton className="w-24 h-24 rounded-full mx-auto" />
            ) : (
                <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} alt={user?.email || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
            )}
            <CardTitle className="mt-4 text-2xl">
              {isLoading ? <Skeleton className="h-8 w-48 mx-auto" /> : user?.email}
            </CardTitle>
            {isLoading ? (
              <div className="h-5"> {/* Wrapper to avoid p > div */}
                <Skeleton className="h-4 w-64 mx-auto mt-1" />
              </div>
            ) : (
              <CardDescription>
                {`Membre depuis le ${formatDate(userProfile?.registrationDate)}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                 <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-xl">Changer le mot de passe</CardTitle>
                 </CardHeader>
                 <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                    {errors.currentPassword && <p className="text-sm font-medium text-destructive">{errors.currentPassword}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    {errors.newPassword && <p className="text-sm font-medium text-destructive">{errors.newPassword}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    {errors.confirmPassword && <p className="text-sm font-medium text-destructive">{errors.confirmPassword}</p>}
                 </div>
                 <Button type="submit" disabled={isPasswordChangeLoading} className="w-full">
                  {isPasswordChangeLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Changer le mot de passe
                </Button>
              </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
