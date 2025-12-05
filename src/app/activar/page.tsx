
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
import { motion } from 'framer-motion';
import { UserPlus, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, Auth } from 'firebase/auth';

// Esquema de validación para ambos pasos
const formSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es obligatorio.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => {
    // La validación de contraseña solo se aplica en el paso 2
    if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});


export default function ActivateAccountPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [auth, setAuth] = useState<Auth | null>(null);
  useEffect(() => {
    try {
        const authInstance = getAuth();
        setAuth(authInstance);
    } catch (e) {
        console.error("Firebase Auth no está inicializado.", e);
    }
  }, []);
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; nombre_completo: string; email: string; } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
        employeeId: '',
        password: '',
        confirmPassword: ''
    }
  });

  const handleVerifyId = async () => {
    const employeeId = form.getValues('employeeId');
    if (!employeeId || !firestore) {
        form.setError('employeeId', { type: 'manual', message: 'El ID de empleado no puede estar vacío.' });
        return;
    }
    setIsLoading(true);

    try {
      // Paso 1: Verificar que el empleado existe en la colección 'Plantilla'.
      // Esta operación es directa y no necesita un índice especial.
      const plantillaDocRef = doc(firestore, 'Plantilla', employeeId);
      const plantillaSnap = await getDoc(plantillaDocRef);

      if (!plantillaSnap.exists()) {
        form.setError('employeeId', { type: 'manual', message: 'ID de empleado no encontrado.' });
        setIsLoading(false);
        return;
      }
      
      // La verificación de usuario duplicado se manejará de forma natural en el paso de creación de cuenta.
      // Si el email ya existe, createUserWithEmailAndPassword fallará con un error específico.
      
      const empleado = plantillaSnap.data();
      const generatedEmail = `${employeeId}_empleado@vinoplastic.com`;
      
      setEmployeeData({ 
        id: employeeId, 
        nombre_completo: empleado.nombre_completo,
        email: generatedEmail
      });
      setStep(2);

    } catch (error) {
      console.error("Error al verificar ID:", error);
      toast({ variant: 'destructive', title: 'Error de Conexión', description: 'Ocurrió un problema al verificar tu ID. Podría ser un problema de permisos o de índice en la base de datos. Contacta a un administrador.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onVerifyClick = async () => {
    const isValid = await form.trigger("employeeId");
    if(isValid) {
        handleVerifyId();
    }
  }

  const handleCreateAccount = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    
    if (!firestore || !auth || !employeeData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Servicios no disponibles o faltan datos.' });
        setIsLoading(false);
        return;
    }

    try {
      // Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, employeeData.email, values.password);
      const user = userCredential.user;

      // Crear el documento del usuario en Firestore
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        id_empleado: employeeData.id,
        nombre: employeeData.nombre_completo,
        email: employeeData.email,
        role: 'empleado',
        requiresPasswordChange: false, 
      });
      
      setStep(3);

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            form.setError('employeeId', { type: 'manual', message: 'Este empleado ya tiene una cuenta activada.'});
            setStep(1); // Regresar al paso 1 para mostrar el error
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
                    {step === 1 && 'Activa tu Cuenta'}
                    {step === 2 && 'Crea tu Contraseña'}
                    {step === 3 && '¡Cuenta Activada!'}
                  </CardTitle>
                  <CardDescription className="text-slate-300 pt-1 text-center">
                    {step === 1 && 'Ingresa tu ID de empleado para comenzar.'}
                    {step === 2 && `¡Hola, ${employeeData?.nombre_completo}! Tu correo será ${employeeData?.email}. Ahora, elige tu contraseña.`}
                    {step === 3 && 'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.'}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                {step === 1 && (
                    <form onSubmit={(e) => { e.preventDefault(); onVerifyClick(); }} className="space-y-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="employeeId">ID de Empleado</Label>
                            <Input {...form.register('employeeId')} id="employeeId" placeholder="Ej: 3204" required className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"/>
                            {form.formState.errors.employeeId && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertTriangle size={14}/> {form.formState.errors.employeeId.message}</p>}
                        </div>
                        <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !firestore}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar ID'}
                        </Button>
                    </form>
                )}
                {step === 2 && (
                     <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-4">
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
                        <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !auth}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear Cuenta y Acceder'}
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

