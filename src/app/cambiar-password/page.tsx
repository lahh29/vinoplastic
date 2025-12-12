'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

// ============================================
// SCHEMA DE VALIDACIÓN
// ============================================

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula.')
    .regex(/[a-z]/, 'Debe contener al menos una letra minúscula.')
    .regex(/[0-9]/, 'Debe contener al menos un número.')
    .refine(
      (val) => !/^(Vino\.2024!|password|12345678|qwerty)$/i.test(val),
      'Esta contraseña no es segura. Elige una diferente.'
    ),
  confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña.'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "La nueva contraseña debe ser diferente a la actual.",
  path: ["newPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// ============================================
// COMPONENTE DE FORTALEZA DE CONTRASEÑA
// ============================================

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const getStrength = useCallback((pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: 'bg-muted' };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Débil', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Media', color: 'bg-yellow-500' };
    return { score, label: 'Fuerte', color: 'bg-green-500' };
  }, []);

  const strength = getStrength(password);
  const percentage = Math.min((strength.score / 6) * 100, 100);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Fortaleza:</span>
        <span className={`font-medium ${
          strength.label === 'Débil' ? 'text-red-500' : 
          strength.label === 'Media' ? 'text-yellow-500' : 'text-green-500'
        }`}>
          {strength.label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${strength.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
        <li className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-500' : ''}`}>
          {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
        </li>
        <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) ? 'text-green-500' : ''}`}>
          {/[A-Z]/.test(password) ? '✓' : '○'} Una letra mayúscula
        </li>
        <li className={`flex items-center gap-1.5 ${/[a-z]/.test(password) ? 'text-green-500' : ''}`}>
          {/[a-z]/.test(password) ? '✓' : '○'} Una letra minúscula
        </li>
        <li className={`flex items-center gap-1.5 ${/[0-9]/.test(password) ? 'text-green-500' : ''}`}>
          {/[0-9]/.test(password) ? '✓' : '○'} Un número
        </li>
      </ul>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRequirement, setIsCheckingRequirement] = useState(true);
  const [requiresChange, setRequiresChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Formulario
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const watchedNewPassword = form.watch('newPassword');

  // ============================================
  // VERIFICAR SI EL USUARIO NECESITA CAMBIAR CONTRASEÑA
  // ============================================

  useEffect(() => {
    const checkPasswordRequirement = async () => {
      // Esperar a que se cargue el usuario
      if (isUserLoading) return;
      
      // Si no hay usuario, redirigir al login
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const userDocRef = doc(firestore, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.requiresPasswordChange === true) {
            setRequiresChange(true);
          } else {
            // No necesita cambiar contraseña, redirigir
            toast({
              title: 'Acceso no requerido',
              description: 'Tu contraseña ya está configurada correctamente.',
            });
            router.replace('/inicio');
            return;
          }
        } else {
          // Usuario no encontrado en Firestore
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.error('Error verificando requisito de contraseña:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo verificar tu estado. Intenta iniciar sesión nuevamente.',
        });
        router.replace('/login');
      } finally {
        setIsCheckingRequirement(false);
      }
    };

    checkPasswordRequirement();
  }, [user, isUserLoading, firestore, router, toast]);

  // ============================================
  // HANDLER DE SUBMIT
  // ============================================

  const onSubmit = async (values: PasswordFormData) => {
    if (!user || !user.email) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de sesión', 
        description: 'No se pudo verificar tu sesión. Por favor, inicia sesión nuevamente.' 
      });
      router.replace('/login');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Re-autenticar al usuario con su contraseña actual
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Actualizar la contraseña
      await updatePassword(user, values.newPassword);
      
      // 3. Actualizar el estado en Firestore
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await updateDoc(userDocRef, { 
        requiresPasswordChange: false,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      });

      // 4. Mostrar éxito
      toast({
        title: "¡Contraseña Actualizada!",
        description: "Tu contraseña ha sido cambiada exitosamente.",
        className: "bg-green-50 text-green-900 border-green-200",
      });

      // 5. Redirigir al inicio
      setTimeout(() => {
        router.push('/inicio');
      }, 1500);

    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      
      let errorMessage = "Ocurrió un error inesperado. Inténtalo de nuevo.";
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "La contraseña actual es incorrecta. Verifica e intenta de nuevo.";
            form.setError('currentPassword', { 
              type: 'manual', 
              message: 'Contraseña incorrecta' 
            });
            break;
          case 'auth/too-many-requests':
            errorMessage = "Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por seguridad. Espera unos minutos.";
            break;
          case 'auth/weak-password':
            errorMessage = "La nueva contraseña es demasiado débil. Elige una más segura.";
            form.setError('newPassword', { 
              type: 'manual', 
              message: 'Contraseña muy débil' 
            });
            break;
          case 'auth/requires-recent-login':
            errorMessage = "Por seguridad, necesitas volver a iniciar sesión antes de cambiar tu contraseña.";
            setTimeout(() => router.push('/login'), 2000);
            break;
          case 'auth/network-request-failed':
            errorMessage = "Error de conexión. Verifica tu internet e intenta de nuevo.";
            break;
        }
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Error al cambiar contraseña', 
        description: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // ESTADOS DE CARGA
  // ============================================

  // Cargando usuario o verificando requisito
  if (isUserLoading || isCheckingRequirement) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
        <StarsBackground starColor="hsl(var(--foreground))" speed={0.5} className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Usuario no autenticado (fallback, debería redirigir)
  if (!user || !requiresChange) {
    return null;
  }

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
      <StarsBackground starColor="hsl(var(--foreground))" speed={0.5} className="absolute inset-0 z-0"/>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="w-full bg-card/40 border-border/50 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }} 
              className="mx-auto bg-primary/20 p-4 rounded-full w-fit border-2 border-primary/30"
            >
              <ShieldCheck className="h-10 w-10 text-primary"/>
            </motion.div>
            <CardTitle className="text-2xl font-bold pt-4">
              Configura tu Contraseña
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Por tu seguridad, es necesario que establezcas una nueva contraseña personal.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {/* Aviso de seguridad */}
            <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Crea una contraseña única que no uses en otros sitios. 
                  Debe tener al menos 8 caracteres con mayúsculas, minúsculas y números.
                </p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Contraseña Actual */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Contraseña Actual
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register('currentPassword')} 
                    id="currentPassword" 
                    type={showCurrentPassword ? "text" : "password"} 
                    className="bg-background/50 border-border/50 pl-10 pr-10" 
                    placeholder="Tu contraseña temporal"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                  </button>
                </div>
                {form.formState.errors.currentPassword && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {form.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* Nueva Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register('newPassword')} 
                    id="newPassword" 
                    type={showNewPassword ? "text" : "password"} 
                    className="bg-background/50 border-border/50 pl-10 pr-10"
                    placeholder="Crea una contraseña segura"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                  </button>
                </div>
                {form.formState.errors.newPassword && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
                <PasswordStrengthIndicator password={watchedNewPassword || ''} />
              </div>

              {/* Confirmar Contraseña */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Nueva Contraseña
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register('confirmPassword')} 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="bg-background/50 border-border/50 pl-10 pr-10"
                    placeholder="Repite tu nueva contraseña"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Botón Submit */}
              <Button 
                type="submit" 
                className="w-full h-12 font-semibold mt-6" 
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 mr-2" />
                    Establecer Nueva Contraseña
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}