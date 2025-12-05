
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
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

// El nuevo esquema ya no pide la contraseña actual.
const formSchema = z.object({
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // La sesión del usuario ya está activa, no se necesita re-autenticar.
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido verificar la sesión de usuario. Por favor, intenta iniciar sesión de nuevo.' });
      return;
    }
    setIsLoading(true);

    try {
      // 1. Cambiar la contraseña directamente. La sesión activa es autorización suficiente.
      await updatePassword(user, values.newPassword);
      
      // 2. Actualizar el estado en Firestore para no volver a pedir el cambio.
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, { requiresPasswordChange: false }, { merge: true });

      toast({
        title: "Contraseña Actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente. Serás redirigido.",
        className: "bg-green-100 text-green-800 border-green-300",
      });

      // 3. Redirigir al usuario a la página de inicio.
      router.push('/inicio');

    } catch (error: any) {
      console.error("Error al cambiar contraseña:", error.code, error.message);
      
      let description = "Ocurrió un error inesperado. Inténtalo de nuevo.";
      if (error.code === 'auth/weak-password') {
          description = "La nueva contraseña es demasiado débil. Por favor, elige una más segura."
      }
      
      toast({ variant: 'destructive', title: 'Error al cambiar contraseña', description });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black p-4">
        <StarsBackground starColor="#fff" speed={0.5} className="absolute inset-0 z-0"/>
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md"
        >
          <Card className="w-full bg-black/30 border-white/20 text-white shadow-3xl backdrop-blur-lg p-6 sm:p-8">
              <CardHeader>
                  <motion.div whileHover={{scale: 1.1, rotate: 5}} className="mx-auto bg-primary/20 p-3 rounded-full w-fit">
                      <KeyRound className="h-10 w-10 text-primary"/>
                  </motion.div>
                  <CardTitle className="text-center text-2xl font-bold pt-4">Establece tu Nueva Contraseña</CardTitle>
                  <CardDescription className="text-slate-300 pt-1 text-center">
                      Por tu seguridad, es necesario que reemplaces tu contraseña temporal por una nueva que solo tú conozcas.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <div className="grid gap-2 text-left">
                          <Label htmlFor="newPassword">Nueva Contraseña</Label>
                          <div className="relative">
                              <Input {...form.register('newPassword')} id="newPassword" type={showNewPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10"/>
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                  {showNewPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                              </button>
                          </div>
                          {form.formState.errors.newPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.newPassword.message}</p>}
                      </div>
                       <div className="grid gap-2 text-left">
                          <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                          <Input {...form.register('confirmPassword')} id="confirmPassword" type={showNewPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                          {form.formState.errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>}
                      </div>

                      <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Establecer Contraseña y Continuar'}
                      </Button>
                  </form>
              </CardContent>
          </Card>
        </motion.div>
    </div>
  );
}

