
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

const formSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function ChangePasswordPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !auth || !user.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido verificar la sesión de usuario.' });
      return;
    }
    setIsLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      
      // Primero re-autenticar
      await reauthenticateWithCredential(user, credential);
      
      // Si la re-autenticación es exitosa, cambiar la contraseña
      await updatePassword(user, values.newPassword);
      
      // Finalmente, actualizar el estado en Firestore
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, { requiresPasswordChange: false }, { merge: true });

      toast({
        title: "Contraseña Actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente. Serás redirigido.",
        className: "bg-green-100 text-green-800 border-green-300",
      });

      router.push('/inicio');

    } catch (error: any) {
      console.error("Error al cambiar contraseña:", error.code, error.message);
      
      let description = "Ocurrió un error inesperado. Inténtalo de nuevo.";
      if (error.code === 'auth/wrong-password') {
          description = "La contraseña actual es incorrecta. Por favor, verifica tus datos."
      } else if (error.code === 'auth/too-many-requests') {
          description = "Has intentado demasiadas veces. Intenta más tarde."
      } else if (error.code === 'auth/invalid-credential') {
          description = "La contraseña actual proporcionada no es válida."
      }
      
      toast({ variant: 'destructive', title: 'Error al cambiar contraseña', description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black p-4">
        <StarsBackground starColor="#fff" speed={0.5} className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex flex-col items-center text-center text-white">
             <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
             >
                <Card className="w-full max-w-md bg-black/30 border-white/20 text-white shadow-3xl backdrop-blur-lg p-6 sm:p-8">
                    <CardHeader>
                        <motion.div whileHover={{scale: 1.1, rotate: 5}} className="mx-auto bg-primary/20 p-3 rounded-full w-fit">
                            <KeyRound className="h-10 w-10 text-primary"/>
                        </motion.div>
                        <CardTitle className="text-2xl font-bold pt-4">Actualización de Contraseña</CardTitle>
                        <CardDescription className="text-slate-300 pt-1">
                            Por tu seguridad, es necesario que actualices la contraseña temporal que te fue asignada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                           <div className="grid gap-2 text-left">
                                <Label htmlFor="currentPassword">Contraseña Actual (Temporal)</Label>
                                <Input {...form.register('currentPassword')} id="currentPassword" type="password" required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                                {form.formState.errors.currentPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.currentPassword.message}</p>}
                            </div>
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                <div className="relative">
                                    <Input {...form.register('newPassword')} id="newPassword" type={showPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10"/>
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                        {showPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                                    </button>
                                </div>
                                {form.formState.errors.newPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.newPassword.message}</p>}
                            </div>
                             <div className="grid gap-2 text-left">
                                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                                <Input {...form.register('confirmPassword')} id="confirmPassword" type={showPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                                {form.formState.errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>}
                            </div>

                            <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Actualizar Contraseña'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
             </motion.div>
        </div>
    </div>
  );
}
