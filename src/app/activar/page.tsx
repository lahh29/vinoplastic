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
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Lock, 
  UserCheck, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { doc, getDoc, setDoc, collection, query, where, getDocs, type Firestore } from 'firebase/firestore';
import { createUserWithEmailAndPassword, type Auth } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { getFirebaseServices } from '@/firebase';

// ============================================
// SCHEMAS DE VALIDACIÓN POR PASO
// ============================================

const step1Schema = z.object({
  employeeId: z.string()
    .min(1, 'El ID de empleado es obligatorio.')
    .regex(/^[a-zA-Z0-9-_]+$/, 'El ID solo puede contener letras, números, guiones y guiones bajos.'),
});

const step2Schema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula.')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula.')
    .regex(/[0-9]/, 'Debe contener al menos un número.'),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña.'),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;

// ============================================
// INTERFACES
// ============================================

interface EmployeeData {
  id: string;
  nombre_completo: string;
  emailGenerado: string;
}

interface FirebaseServices {
  auth: Auth;
  firestore: Firestore;
}

// ============================================
// CONSTANTES
// ============================================

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

// ============================================
// COMPONENTE DE FORTALEZA DE CONTRASEÑA
// ============================================

interface PasswordStrengthProps {
  password: string;
}

function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const getStrength = useCallback((pwd: string): { score: number; label: string; color: string } => {
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
    <div className="space-y-1 mt-2">
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
      <ul className="text-xs text-muted-foreground space-y-0.5 mt-2">
        <li className={password.length >= 8 ? 'text-green-500' : ''}>
          {password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
        </li>
        <li className={/[A-Z]/.test(password) ? 'text-green-500' : ''}>
          {/[A-Z]/.test(password) ? '✓' : '○'} Una mayúscula
        </li>
        <li className={/[a-z]/.test(password) ? 'text-green-500' : ''}>
          {/[a-z]/.test(password) ? '✓' : '○'} Una minúscula
        </li>
        <li className={/[0-9]/.test(password) ? 'text-green-500' : ''}>
          {/[0-9]/.test(password) ? '✓' : '○'} Un número
        </li>
      </ul>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ActivateAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados de Firebase
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [initError, setInitError] = useState(false);
  
  // Estados de flujo
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados de rate limiting
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // Formularios separados por paso
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: { employeeId: '' }
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Observar el valor del password para el indicador de fortaleza
  const watchedPassword = step2Form.watch('password');

  // ============================================
  // EFECTOS
  // ============================================

  // Inicializar Firebase
  useEffect(() => {
    let mounted = true;
    
    const initFirebase = () => {
      try {
        const services = getFirebaseServices();
        if (mounted) {
          setFirebaseServices(services);
          setInitError(false);
        }
      } catch (e) {
        console.error("Error al inicializar Firebase:", e);
        if (mounted) {
          setInitError(true);
        }
      }
    };

    initFirebase();
    
    return () => { mounted = false; };
  }, []);

  // Manejar el contador de bloqueo
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remaining = lockoutUntil - Date.now();
      if (remaining <= 0) {
        setLockoutUntil(null);
        setAttempts(0);
        setRemainingTime(0);
      } else {
        setRemainingTime(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Cargar intentos desde localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem('activateAttempts');
    const storedLockout = localStorage.getItem('activateLockout');
    
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10));
    }
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('activateLockout');
        localStorage.removeItem('activateAttempts');
      }
    }
  }, []);

  // Guardar intentos en localStorage
  useEffect(() => {
    localStorage.setItem('activateAttempts', attempts.toString());
    if (lockoutUntil) {
      localStorage.setItem('activateLockout', lockoutUntil.toString());
    }
  }, [attempts, lockoutUntil]);

  // ============================================
  // FUNCIONES DE RATE LIMITING
  // ============================================

  const checkRateLimit = useCallback((): boolean => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return false;
    }
    return true;
  }, [lockoutUntil]);

  const incrementAttempts = useCallback(() => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockoutTime);
      toast({
        variant: 'destructive',
        title: 'Demasiados intentos',
        description: `Has excedido el límite. Espera 5 minutos antes de intentar nuevamente.`,
      });
    }
  }, [attempts, toast]);

  const resetAttempts = useCallback(() => {
    setAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('activateAttempts');
    localStorage.removeItem('activateLockout');
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleVerifyId = async (data: Step1Data) => {
    if (!checkRateLimit()) {
      toast({
        variant: 'destructive',
        title: 'Cuenta bloqueada temporalmente',
        description: `Espera ${remainingTime} segundos antes de intentar nuevamente.`,
      });
      return;
    }

    setIsLoading(true);
    step1Form.clearErrors();
    
    if (!firebaseServices) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de Inicialización', 
        description: 'Los servicios no están disponibles. Recarga la página.' 
      });
      setIsLoading(false);
      return;
    }
    
    const { firestore } = firebaseServices;

    try {
      const idLimpio = data.employeeId.trim().toUpperCase();
      
      // Verificar si existe en Plantilla
      const plantillaDocRef = doc(firestore, 'Plantilla', idLimpio);
      const plantillaSnap = await getDoc(plantillaDocRef);

      if (!plantillaSnap.exists()) {
        incrementAttempts();
        step1Form.setError('employeeId', { 
          type: 'manual', 
          message: 'ID de empleado no encontrado. Verifica que sea correcto.' 
        });
        setIsLoading(false);
        return;
      }

      // Verificar si ya tiene cuenta
      const usuariosRef = collection(firestore, 'usuarios');
      const q = query(usuariosRef, where("id_empleado", "==", idLimpio));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        incrementAttempts();
        step1Form.setError('employeeId', { 
          type: 'manual', 
          message: 'Este ID ya tiene una cuenta activada. Usa el login normal.' 
        });
        setIsLoading(false);
        return;
      }
      
      // Éxito - resetear intentos y avanzar
      resetAttempts();
      
      const datosEmpleado = plantillaSnap.data();
      const emailGenerado = `${idLimpio.toLowerCase()}_empleado@vinoplastic.com`;

      setEmployeeData({ 
        id: idLimpio, 
        nombre_completo: datosEmpleado.nombre_completo || 'Empleado',
        emailGenerado: emailGenerado
      });
      
      // Limpiar formulario del paso 2
      step2Form.reset({ password: '', confirmPassword: '' });
      setStep(2);

    } catch (error) {
      console.error("Error al verificar ID:", error);
      
      if (error instanceof FirebaseError) {
        if (error.code === 'unavailable') {
          toast({ 
            variant: 'destructive', 
            title: 'Sin conexión', 
            description: 'No hay conexión con el servidor. Verifica tu internet.' 
          });
        } else {
          toast({ 
            variant: 'destructive', 
            title: 'Error de Verificación', 
            description: 'Ocurrió un problema al conectar con la base de datos.' 
          });
        }
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error inesperado', 
          description: 'Intenta nuevamente más tarde.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (data: Step2Data) => {
    setIsLoading(true);
    
    if (!firebaseServices || !employeeData) {
      toast({ 
        variant: 'destructive', 
        title: 'Error Interno', 
        description: 'Faltan datos para crear la cuenta. Reinicia el proceso.' 
      });
      setIsLoading(false);
      handleGoBack();
      return;
    }
    
    const { auth, firestore } = firebaseServices;
    
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employeeData.emailGenerado, 
        data.password
      );
      const user = userCredential.user;

      // Crear documento en Firestore
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        id_empleado: employeeData.id,
        nombre: employeeData.nombre_completo,
        email: employeeData.emailGenerado,
        role: 'empleado',
        createdAt: new Date(),
        updatedAt: new Date(),
        requiresPasswordChange: false,
        isActive: true,
      });
      
      // Éxito
      setStep(3);
      
      toast({
        title: '¡Cuenta creada!',
        description: 'Tu cuenta ha sido activada exitosamente.',
      });

    } catch (error) {
      console.error("Error creando cuenta:", error);
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            toast({ 
              variant: 'destructive', 
              title: 'Cuenta existente', 
              description: 'Esta cuenta ya fue registrada. Contacta a RH si tienes problemas.' 
            });
            // Volver al inicio
            handleGoBack();
            break;
            
          case 'auth/weak-password':
            step2Form.setError('password', {
              type: 'manual',
              message: 'La contraseña es muy débil. Usa una más segura.'
            });
            break;
            
          case 'auth/network-request-failed':
            toast({ 
              variant: 'destructive', 
              title: 'Error de red', 
              description: 'Verifica tu conexión a internet.' 
            });
            break;
            
          default:
            toast({ 
              variant: 'destructive', 
              title: 'Error al crear cuenta', 
              description: 'No se pudo completar el registro. Intenta nuevamente.' 
            });
        }
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error inesperado', 
          description: 'Ocurrió un problema. Intenta nuevamente.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    step1Form.reset({ employeeId: '' });
    step2Form.reset({ password: '', confirmPassword: '' });
    setEmployeeData(null);
    setStep(1);
  };

  const handleRetryInit = () => {
    setInitError(false);
    try {
      const services = getFirebaseServices();
      setFirebaseServices(services);
    } catch (e) {
      setInitError(true);
    }
  };

  // ============================================
  // RENDER: ESTADO DE ERROR DE INICIALIZACIÓN
  // ============================================

  if (initError) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
        <StarsBackground starColor="hsl(var(--foreground))" speed={0.5} className="absolute inset-0 z-0"/>
        <Card className="relative z-10 w-full max-w-md bg-card/60 border-border/50 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-6">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
            <div className="space-y-2">
              <CardTitle className="text-xl">Error de Conexión</CardTitle>
              <CardDescription>
                No se pudo conectar con los servicios. Verifica tu conexión a internet e intenta nuevamente.
              </CardDescription>
            </div>
            <Button onClick={handleRetryInit} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
            <Button variant="link" asChild className="text-muted-foreground">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // RENDER: ESTADO DE BLOQUEO
  // ============================================

  if (lockoutUntil && Date.now() < lockoutUntil) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
        <StarsBackground starColor="hsl(var(--foreground))" speed={0.5} className="absolute inset-0 z-0"/>
        <Card className="relative z-10 w-full max-w-md bg-card/60 border-border/50 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-8 text-center space-y-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto" />
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-xl">Cuenta Bloqueada Temporalmente</CardTitle>
              <CardDescription>
                Has excedido el número máximo de intentos. Por seguridad, debes esperar antes de continuar.
              </CardDescription>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-3xl font-mono font-bold text-foreground">
                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Tiempo restante</p>
            </div>
            <Button variant="link" asChild className="text-muted-foreground">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // RENDER: FLUJO PRINCIPAL
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
        <Card className="w-full bg-card/60 border-border/50 shadow-2xl backdrop-blur-xl">
          {/* Indicador de pasos */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step 
                      ? 'w-8 bg-primary' 
                      : s < step 
                        ? 'w-2 bg-primary/60' 
                        : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Paso {step} de 3
            </p>
          </div>

          <div className="overflow-hidden relative min-h-[480px]">
            <AnimatePresence mode="wait">
              {/* ========== PASO 1: VERIFICACIÓN ========== */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute inset-0 p-6 flex flex-col justify-center"
                >
                  <form onSubmit={step1Form.handleSubmit(handleVerifyId)} className="space-y-6">
                    <CardHeader className="p-0 text-center">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="mx-auto bg-primary/20 p-4 rounded-full w-fit mb-4 border-2 border-primary/30 shadow-lg shadow-primary/20"
                      >
                        <UserCheck className="h-8 w-8 text-primary"/>
                      </motion.div>
                      <CardTitle className="text-2xl font-bold tracking-tight">
                        Portal de Empleado
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-base">
                        Ingresa tu ID de nómina para activar tu cuenta.
                      </CardDescription>
                    </CardHeader>
                    
                    <div className="space-y-4 pt-4">
                      <div className="grid gap-2 text-left">
                        <Label htmlFor="employeeId" className="text-sm font-medium text-muted-foreground">
                          ID de Empleado
                        </Label>
                        <Input 
                          {...step1Form.register('employeeId')} 
                          id="employeeId" 
                          placeholder="Ej: EMP001" 
                          className="bg-background/50 border-border/50 placeholder:text-muted-foreground pl-4 py-6 text-lg tracking-widest text-center uppercase"
                          autoComplete="off"
                          disabled={isLoading}
                        />
                        {step1Form.formState.errors.employeeId && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-xs mt-1 flex items-center gap-1.5"
                          >
                            <AlertTriangle size={14}/> 
                            {step1Form.formState.errors.employeeId.message}
                          </motion.p>
                        )}
                      </div>
                      
                      {attempts > 0 && attempts < MAX_ATTEMPTS && (
                        <p className="text-xs text-yellow-500 text-center">
                          Intentos restantes: {MAX_ATTEMPTS - attempts}
                        </p>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-md font-semibold" 
                        disabled={isLoading || !firebaseServices}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            Verificar ID 
                            <ArrowRight className="ml-2 h-4 w-4"/>
                          </>
                        )}
                      </Button>
                      
                      <div className="text-center">
                        <Button variant="link" asChild className="text-muted-foreground">
                          <Link href="/login">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver a Login
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ========== PASO 2: CREAR CONTRASEÑA ========== */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute inset-0 p-6 flex flex-col justify-center"
                >
                  <form onSubmit={step2Form.handleSubmit(handleCreateAccount)} className="space-y-4">
                    <CardHeader className="p-0 text-center">
                      <motion.div 
                        whileHover={{ scale: 1.1 }} 
                        className="mx-auto bg-primary/20 p-4 rounded-full w-fit mb-4"
                      >
                        <KeyRound className="h-8 w-8 text-primary"/>
                      </motion.div>
                      <CardTitle className="text-2xl font-bold">
                        ¡Hola, {employeeData?.nombre_completo.split(' ')[0]}!
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Define una contraseña segura para tu cuenta.
                      </CardDescription>
                    </CardHeader>
                    
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
                      <p className="text-xs text-primary mb-1 uppercase tracking-wider font-bold">
                        Tu usuario de acceso:
                      </p>
                      <p className="text-sm font-mono text-foreground break-all">
                        {employeeData?.emailGenerado}
                      </p>
                    </div>
                    
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...step2Form.register('password')} 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          className="bg-background/50 border-border/50 text-foreground pl-10 pr-10" 
                          placeholder="Mínimo 8 caracteres"
                          disabled={isLoading}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)} 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {step2Form.formState.errors.password && (
                        <p className="text-destructive text-xs">
                          {step2Form.formState.errors.password.message}
                        </p>
                      )}
                      <PasswordStrengthIndicator password={watchedPassword || ''} />
                    </div>
                    
                    <div className="grid gap-2 text-left">
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          {...step2Form.register('confirmPassword')} 
                          id="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"} 
                          className="bg-background/50 border-border/50 text-foreground pl-10 pr-10" 
                          placeholder="Repite la contraseña"
                          disabled={isLoading}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {step2Form.formState.errors.confirmPassword && (
                        <p className="text-destructive text-xs">
                          {step2Form.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleGoBack}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Atrás
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-[2] font-bold" 
                        disabled={isLoading || !step2Form.formState.isValid}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          'Activar Cuenta'
                        )}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ========== PASO 3: ÉXITO ========== */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute inset-0 p-6 flex flex-col justify-center text-center space-y-6"
                >
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  >
                    <CheckCircle className="h-24 w-24 text-green-500 mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold">¡Cuenta Activada!</CardTitle>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Tu cuenta ha sido configurada exitosamente. Ahora puedes acceder al portal de empleados.
                    </p>
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Datos de acceso:
                    </p>
                    <p className="text-sm font-mono text-foreground break-all">
                      <span className="text-muted-foreground">Usuario:</span> {employeeData?.emailGenerado}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Usa la contraseña que acabas de crear.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={() => router.push('/login')} 
                    className="w-full font-bold h-12 flex items-center justify-center gap-2"
                  >
                    Ir a Iniciar Sesión 
                    <ArrowRight className="h-4 w-4"/>
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