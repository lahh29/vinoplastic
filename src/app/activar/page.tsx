
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, Lock, UserCheck, KeyRound, ArrowRight } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const formSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es obligatorio.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.password || data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};


export default function ActivateAccountPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; nombre_completo: string; emailGenerado: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  const handleVerifyId = async (data: FormData) => {
    setIsLoading(true);
    if (!firestore) return;

    try {
        const idLimpio = data.employeeId.trim();
        const plantillaDocRef = doc(firestore, 'Plantilla', idLimpio);
        const plantillaSnap = await getDoc(plantillaDocRef);

        if (!plantillaSnap.exists()) {
            form.setError('employeeId', { type: 'manual', message: 'ID no encontrado. Verifica que sea correcto.' });
            return;
        }
        
        const datosEmpleado = plantillaSnap.data();
        const emailGenerado = `${idLimpio}_empleado@vinoplastic.com`;

        setEmployeeData({ 
            id: idLimpio, 
            nombre_completo: datosEmpleado.nombre_completo,
            emailGenerado: emailGenerado
        });
        setStep(2);

    } catch (error) {
        console.error("Error al verificar ID:", error);
        toast({ variant: 'destructive', title: 'Error de Verificación', description: 'Ocurrió un problema al verificar tu ID. Intenta más tarde.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateAccount = async (data: FormData) => {
    setIsLoading(true);
    if (!firestore || !employeeData || !data.password) {
      setIsLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.emailGenerado, data.password);
      const user = userCredential.user;

      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        id_empleado: employeeData.id,
        nombre: employeeData.nombre_completo,
        email: employeeData.emailGenerado,
        role: 'empleado',
        createdAt: new Date(),
        requiresPasswordChange: false, // El usuario ya define su contraseña final.
      });
      
      setStep(3);

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({ variant: 'destructive', title: 'Cuenta Existente', description: 'Ya existe una cuenta asociada a este ID de empleado.' });
            form.reset();
            setStep(1);
        } else {
            console.error("Error creando cuenta:", error);
            toast({ variant: 'destructive', title: 'Error Crítico', description: error.message || 'No se pudo crear la cuenta.' });
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
        <StarsBackground starColor="hsl(var(--foreground))" speed={0.5} className="absolute inset-0 z-0"/>
        
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md"
        >
          <Card className="w-full bg-card/60 border-border/50 shadow-2xl backdrop-blur-xl">
              <div className="overflow-hidden relative h-[520px]">
                <AnimatePresence mode="wait">
                    {/* PASO 1: VERIFICACIÓN */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                            className="absolute inset-0 p-6 flex flex-col justify-center"
                        >
                            <form onSubmit={form.handleSubmit(handleVerifyId)} className="space-y-6">
                                <CardHeader className="p-0 text-center">
                                    <motion.div 
                                      whileHover={{scale: 1.1, rotate: -5}}
                                      transition={{ type: 'spring', stiffness: 300}}
                                      className="mx-auto bg-primary/20 p-4 rounded-full w-fit mb-4 border-2 border-primary/30 shadow-lg shadow-primary/20"
                                    >
                                        <UserCheck className="h-8 w-8 text-primary"/>
                                    </motion.div>
                                    <CardTitle className="text-2xl font-bold tracking-tight">Portal de Empleado</CardTitle>
                                    <CardDescription className="text-muted-foreground text-base">Ingresa tu ID de nómina para activar tu cuenta.</CardDescription>
                                </CardHeader>
                                
                                <div className="space-y-4 pt-4">
                                    <div className="grid gap-2 text-left">
                                        <Label htmlFor="employeeId" className="text-sm font-medium text-muted-foreground">Activación</Label>
                                        <Input 
                                            {...form.register('employeeId')} 
                                            id="employeeId" 
                                            placeholder="Ingresa tu ID" 
                                            className="bg-background/50 border-border/50 placeholder:text-muted-foreground pl-4 py-6 text-lg tracking-widest text-center"
                                            autoComplete="off"
                                        />
                                        {form.formState.errors.employeeId && (
                                            <p className="text-destructive text-xs mt-1 flex items-center gap-1.5 animate-pulse">
                                                <AlertTriangle size={14}/> {form.formState.errors.employeeId.message}
                                            </p>
                                        )}
                                    </div>
                                    <Button type="submit" className="w-full h-12 text-md font-semibold" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Valida tu ID <ArrowRight className="ml-2 h-4 w-4"/></>}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* PASO 2: CONTRASEÑA */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                            className="absolute inset-0 p-6 flex flex-col justify-center"
                        >
                            <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-5">
                                <CardHeader className="p-0 text-center">
                                    <motion.div whileHover={{scale: 1.1}} className="mx-auto bg-primary/20 p-4 rounded-full w-fit mb-4">
                                        <KeyRound className="h-8 w-8 text-primary"/>
                                    </motion.div>
                                    <CardTitle className="text-2xl font-bold">¡Hola, {employeeData?.nombre_completo.split(' ')[0]}!</CardTitle>
                                    <CardDescription className="text-muted-foreground">Define una contraseña segura para tu cuenta.</CardDescription>
                                </CardHeader>
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center mt-4">
                                    <p className="text-xs text-primary mb-1 uppercase tracking-wider font-bold">Tu usuario de acceso será:</p>
                                    <p className="text-sm font-mono text-foreground">{employeeData?.emailGenerado}</p>
                                </div>
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="password">Crear Contraseña</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input {...form.register('password')} id="password" type={showPassword ? "text" : "password"} className="bg-background/50 border-border/50 text-foreground pl-10 pr-10" placeholder="Mínimo 8 caracteres" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"><EyeOff size={16} /></button>
                                    </div>
                                    {form.formState.errors.password && <p className="text-destructive text-xs">{form.formState.errors.password.message}</p>}
                                </div>
                                <div className="grid gap-2 text-left">
                                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                    <Input {...form.register('confirmPassword')} id="confirmPassword" type={showPassword ? "text" : "password"} className="bg-background/50 border-border/50 text-foreground pl-4" placeholder="Repite la contraseña" />
                                    {form.formState.errors.confirmPassword && <p className="text-destructive text-xs">{form.formState.errors.confirmPassword.message}</p>}
                                </div>
                                <Button type="submit" className="w-full mt-2 h-12 font-bold" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activar Cuenta'}
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {/* PASO 3: ÉXITO */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            variants={stepVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                             className="absolute inset-0 p-6 flex flex-col justify-center text-center space-y-6"
                        >
                            <motion.div initial={{scale: 0.5}} animate={{scale: 1}} transition={{type: 'spring', stiffness: 200, delay: 0.2}}>
                               <CheckCircle className="h-24 w-24 text-green-500 mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                            </motion.div>
                            <div className="space-y-2">
                                <CardTitle className="text-2xl font-bold">¡Cuenta Activada!</CardTitle>
                                <p className="text-muted-foreground max-w-xs mx-auto">Has configurado tu acceso. Ahora puedes ver tu portal personal.</p>
                            </div>
                            <Button onClick={() => router.push('/login')} className="w-full font-bold h-12 flex items-center gap-2">
                                Ir a Login <ArrowRight className="h-4 w-4"/>
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
              </div>
          </Card>
        </motion.div>
    </div>
  );
}

