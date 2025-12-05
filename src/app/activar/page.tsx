
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
import { UserPlus, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
// Importaciones de Firebase necesarias
import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Esquema de validación simplificado (ya no pedimos email)
const formSchema = z.object({
  employeeId: z.string().min(1, 'El ID de empleado es obligatorio.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
  // Validamos contraseña solo en el paso 2
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
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<{ id: string; nombre_completo: string; emailGenerado: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  const employeeId = useWatch({ control: form.control, name: 'employeeId' });

  // 1. LÓGICA DE VERIFICACIÓN (Paso 1)
  const handleVerifyId = async () => {
    setIsLoading(true);
    if (!firestore || !employeeId) {
        setIsLoading(false);
        return;
    };

    try {
      const idLimpio = employeeId.trim(); // Limpiamos espacios

      // A. Buscar en la colección 'Plantilla' por el campo 'id_empleado'
      const plantillaRef = doc(firestore, 'Plantilla', idLimpio);
      const plantillaSnap = await getDoc(plantillaRef);

      if (!plantillaSnap.exists()) {
        form.setError('employeeId', { type: 'manual', message: 'ID no encontrado en la plantilla de empleados.' });
        setIsLoading(false);
        return;
      }
      
      const datosEmpleado = plantillaSnap.data();

      // B. Generar el Email Institucional Automáticamente
      // Formato: id_empleado_empleado@vinoplastic.com
      const emailGenerado = `${idLimpio}_empleado@vinoplastic.com`;

      // Éxito: Guardamos datos temporales y pasamos al paso 2
      setEmployeeData({ 
          id: idLimpio, 
          nombre_completo: datosEmpleado.nombre_completo || 'Empleado', // Fallback por si no tiene nombre
          emailGenerado: emailGenerado
      });
      setStep(2);

    } catch (error) {
      console.error("Error verificando ID:", error);
      toast({ variant: 'destructive', title: 'Error de conexión', description: 'No se pudo verificar la base de datos.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const onVerifyClick = async () => {
    const isValid = await form.trigger("employeeId");
    if(isValid) handleVerifyId();
  }

  // 2. LÓGICA DE CREACIÓN DE CUENTA (Paso 2)
  const handleCreateAccount = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    // Verificaciones de seguridad
    if (!firestore || !employeeData || !values.password) {
        setIsLoading(false); 
        return;
    };

    try {
      const auth = getAuth(); // Inicializamos Auth aquí para evitar errores de SSR
      
      // A. Crear usuario en Firebase Authentication con el Email Generado
      const userCredential = await createUserWithEmailAndPassword(
          auth, 
          employeeData.emailGenerado, 
          values.password
      );
      const user = userCredential.user;

      // B. Crear el documento de perfil en Firestore (Colección 'usuarios')
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid, // Guardamos UID por referencia
        id_empleado: employeeData.id,
        nombre: employeeData.nombre_completo,
        email: employeeData.emailGenerado,
        role: 'empleado', // Rol forzado
        createdAt: new Date(),
        active: true
      });
      
      setStep(3); // Éxito

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            toast({ variant: 'destructive', title: 'Cuenta existente', description: 'Parece que este correo ya está registrado en el sistema.' });
        } else {
            console.error("Error creando cuenta:", error);
            toast({ variant: 'destructive', title: 'Error Crítico', description: error.message || 'No se pudo crear la cuenta.' });
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
          <Card className="w-full bg-black/40 border-white/10 text-white shadow-2xl backdrop-blur-xl p-6">
              <CardHeader>
                  <motion.div whileHover={{scale: 1.1}} className="mx-auto bg-primary/20 p-4 rounded-full w-fit mb-2">
                      <UserPlus className="h-8 w-8 text-primary"/>
                  </motion.div>
                  <CardTitle className="text-center text-2xl font-bold">
                    {step === 1 && 'Portal del Empleado'}
                    {step === 2 && 'Seguridad de Cuenta'}
                    {step === 3 && '¡Bienvenido!'}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-center">
                    {step === 1 && 'Ingresa tu ID de nómina para comenzar el registro.'}
                    {step === 2 && `Hola, ${employeeData?.nombre_completo}. Define tu contraseña personal.`}
                    {step === 3 && 'Tu cuenta ha sido activada correctamente.'}
                  </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* PASO 1: VERIFICACIÓN */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="employeeId" className="text-sm font-medium text-slate-200">ID de Empleado</Label>
                            <div className="relative">
                                <Input 
                                    {...form.register('employeeId')} 
                                    id="employeeId" 
                                    placeholder="Ej: 3204" 
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 pl-4 py-6 text-lg tracking-widest"
                                    autoComplete="off"
                                />
                            </div>
                            {form.formState.errors.employeeId && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle size={12}/> {form.formState.errors.employeeId.message}
                                </p>
                            )}
                        </div>
                        <Button onClick={onVerifyClick} className="w-full mt-2 h-12 text-md font-semibold bg-white text-black hover:bg-slate-200 transition-all" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verificar Identidad'}
                        </Button>
                    </div>
                )}

                {/* PASO 2: CONTRASEÑA */}
                {step === 2 && (
                     <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-5">
                        
                        {/* Mostrar el Email Generado (Solo lectura para que el usuario sepa su usuario) */}
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                            <p className="text-xs text-primary mb-1 uppercase tracking-wider font-bold">Tu Usuario de Acceso será:</p>
                            <p className="text-sm font-mono text-white">{employeeData?.emailGenerado}</p>
                        </div>

                         <div className="grid gap-2 text-left">
                            <Label htmlFor="password">Crear Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input 
                                    {...form.register('password')} 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    className="bg-white/5 border-white/10 text-white pl-10 pr-10"
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.formState.errors.password && <p className="text-red-400 text-xs">{form.formState.errors.password.message}</p>}
                        </div>

                        <div className="grid gap-2 text-left">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input 
                                    {...form.register('confirmPassword')} 
                                    id="confirmPassword" 
                                    type={showPassword ? "text" : "password"} 
                                    className="bg-white/5 border-white/10 text-white pl-10"
                                    placeholder="Repite la contraseña"
                                />
                            </div>
                            {form.formState.errors.confirmPassword && <p className="text-red-400 text-xs">{form.formState.errors.confirmPassword.message}</p>}
                        </div>

                        <Button type="submit" className="w-full mt-2 h-12 font-bold bg-primary hover:bg-primary/90 text-black" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activar Cuenta'}
                        </Button>
                        <Button type="button" variant="link" onClick={() => setStep(1)} className="w-full text-slate-400 text-xs">
                            Volver, no soy {employeeData?.nombre_completo}
                        </Button>
                    </form>
                )}

                {/* PASO 3: ÉXITO */}
                 {step === 3 && (
                    <div className="text-center space-y-6 pt-2">
                        <motion.div initial={{scale: 0.5}} animate={{scale: 1}} transition={{type: 'spring', stiffness: 200}}>
                           <CheckCircle className="h-20 w-20 text-green-500 mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                        </motion.div>
                        <div className="space-y-2">
                            <p className="text-slate-300">Has configurado tu acceso correctamente.</p>
                            <div className="bg-slate-900 p-3 rounded text-sm text-slate-400">
                                Usuario: <span className="text-white font-mono">{employeeData?.emailGenerado}</span>
                            </div>
                        </div>
                        <Button onClick={() => router.push('/login')} className="w-full bg-white text-black hover:bg-slate-200 font-bold h-12">
                            Ir al Panel de Empleado
                        </Button>
                    </div>
                )}
              </CardContent>
          </Card>
        </motion.div>
    </div>
  );
}
