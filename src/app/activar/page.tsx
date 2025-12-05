
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { UserPlus, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';


const formSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es obligatorio.'),
  email: z.string().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});


export default function ActivateAccountPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = getAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; nombre_completo: string; } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const employeeId = useWatch({ control: form.control, name: 'employeeId' });

  const handleVerifyId = async () => {
    setIsLoading(true);
    if (!firestore) return;

    try {
      // 1. Verificar que el empleado exista en 'Plantilla'
      const plantillaRef = doc(firestore, 'Plantilla', employeeId);
      const plantillaSnap = await getDocs(query(collection(firestore, 'Plantilla'), where('id_empleado', '==', employeeId), limit(1)));

      if (plantillaSnap.empty) {
        form.setError('employeeId', { type: 'manual', message: 'ID de empleado no encontrado.' });
        return;
      }
      
      const empleado = plantillaSnap.docs[0].data();

      // 2. Verificar que el empleado NO tenga ya una cuenta en 'usuarios'
      const usuariosRef = query(collection(firestore, 'usuarios'), where('id_empleado', '==', employeeId), limit(1));
      const usuariosSnap = await getDocs(usuariosRef);

      if (!usuariosSnap.empty) {
        form.setError('employeeId', { type: 'manual', message: 'Este empleado ya tiene una cuenta activada.' });
        return;
      }

      // Si todo es correcto, avanzar al siguiente paso
      setEmployeeData({ id: employeeId, nombre_completo: empleado.nombre_completo });
      setStep(2);

    } catch (error) {
      console.error("Error al verificar ID:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un problema al verificar tu ID. Intenta más tarde.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    if (!firestore || !employeeData) return;

    try {
      // 1. Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Crear documento en 'usuarios'
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        id_empleado: employeeData.id,
        nombre: employeeData.nombre_completo,
        email: values.email,
        role: 'empleado',
        requiresPasswordChange: false, // Ya establece su contraseña definitiva
      });
      
      setStep(3); // Mover a la pantalla de éxito

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            form.setError('email', { type: 'manual', message: 'Este correo electrónico ya está en uso.'});
        } else {
            console.error("Error al crear cuenta:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear tu cuenta. Intenta de nuevo.' });
        }
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
                      <UserPlus className="h-10 w-10 text-primary"/>
                  </motion.div>
                  <CardTitle className="text-center text-2xl font-bold pt-4">
                    {step === 1 && 'Activa tu Cuenta de Empleado'}
                    {step === 2 && 'Completa tu Registro'}
                    {step === 3 && '¡Cuenta Activada!'}
                  </CardTitle>
                  <CardDescription className="text-slate-300 pt-1 text-center">
                    {step === 1 && 'Ingresa tu ID de empleado para comenzar.'}
                    {step === 2 && `Bienvenido, ${employeeData?.nombre_completo}. Ahora crea tus credenciales de acceso.`}
                    {step === 3 && 'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.'}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                {step === 1 && (
                    <form onSubmit={form.handleSubmit(handleVerifyId)} className="space-y-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="employeeId">ID de Empleado</Label>
                            <Input {...form.register('employeeId')} id="employeeId" placeholder="Ej: 3204" required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                            {form.formState.errors.employeeId && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={14}/> {form.formState.errors.employeeId.message}</p>}
                        </div>
                        <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar ID'}
                        </Button>
                    </form>
                )}
                {step === 2 && (
                     <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input {...form.register('email')} id="email" type="email" placeholder="tu.correo@ejemplo.com" required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                            {form.formState.errors.email && <p className="text-red-400 text-xs mt-1">{form.formState.errors.email.message}</p>}
                        </div>
                         <div className="grid gap-2 text-left">
                            <Label htmlFor="password">Crea tu Contraseña</Label>
                            <div className="relative">
                                <Input {...form.register('password')} id="password" type={showPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 pr-10"/>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.formState.errors.password && <p className="text-red-400 text-xs mt-1">{form.formState.errors.password.message}</p>}
                        </div>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="confirmPassword">Confirma tu Contraseña</Label>
                            <Input {...form.register('confirmPassword')} id="confirmPassword" type={showPassword ? "text" : "password"} required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                            {form.formState.errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>}
                        </div>
                        <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Cuenta y Continuar'}
                        </Button>
                    </form>
                )}
                 {step === 3 && (
                    <div className="text-center space-y-6">
                        <motion.div initial={{scale: 0.5}} animate={{scale: 1}} transition={{type: 'spring'}}>
                           <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
                        </motion.div>
                        <Button onClick={() => router.push('/login')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                            Ir a Iniciar Sesión
                        </Button>
                    </div>
                )}
              </CardContent>
          </Card>
        </motion.div>
    </div>
  );
}

