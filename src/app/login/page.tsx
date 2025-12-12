'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, signInWithEmail, getFirebaseServices } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock,
  ShieldAlert 
} from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { ShinyButton } from '@/components/ui/shiny-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================
// CONSTANTES
// ============================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutos

// ============================================
// TIPOS
// ============================================

interface LoginFormData {
  email: string;
  password: string;
}

// ============================================
// HELPERS
// ============================================

function getErrorMessage(error: FirebaseError): string {
  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
      return 'Correo o contraseña incorrectos.';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada. Contacta a RH.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Cuenta bloqueada temporalmente.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet.';
    case 'auth/internal-error':
      return 'Error interno del servidor. Intenta más tarde.';
    default:
      console.error('Firebase Auth Error:', error.code, error.message);
      return 'Ocurrió un error al iniciar sesión.';
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de rate limiting
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // ============================================
  // EFECTOS
  // ============================================

  // Cargar intentos desde localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem('loginAttempts');
    const storedLockout = localStorage.getItem('loginLockout');
    
    if (storedAttempts) {
      setLoginAttempts(parseInt(storedAttempts, 10));
    }
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('loginLockout');
        localStorage.removeItem('loginAttempts');
      }
    }
  }, []);

  // Guardar intentos en localStorage
  useEffect(() => {
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    if (lockoutUntil) {
      localStorage.setItem('loginLockout', lockoutUntil.toString());
    }
  }, [loginAttempts, lockoutUntil]);

  // Contador de bloqueo
  useEffect(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remaining = lockoutUntil - Date.now();
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLoginAttempts(0);
        setRemainingTime(0);
        localStorage.removeItem('loginLockout');
        localStorage.removeItem('loginAttempts');
      } else {
        setRemainingTime(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/inicio');
    }
  }, [user, isUserLoading, router]);

  // ============================================
  // HANDLERS
  // ============================================

  const resetAttempts = useCallback(() => {
    setLoginAttempts(0);
    setLockoutUntil(null);
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('loginLockout');
  }, []);

  const incrementAttempts = useCallback(() => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      setLockoutUntil(lockoutTime);
    }
  }, [loginAttempts]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar bloqueo
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setError(`Cuenta bloqueada. Espera ${Math.ceil(remainingTime / 60)} minutos.`);
      return;
    }

    // Validar campos
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Iniciar sesión
      const userCredential = await signInWithEmail(email.trim().toLowerCase(), password);
      
      // 2. Resetear intentos en login exitoso
      resetAttempts();
      
      // 3. Verificar si necesita cambiar contraseña
      const { firestore } = getFirebaseServices();
      const userDocRef = doc(firestore, 'usuarios', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Verificar si la cuenta está activa
        if (userData.isActive === false) {
          setError('Tu cuenta ha sido desactivada. Contacta a RH.');
          setIsLoading(false);
          return;
        }
        
        // Verificar si necesita cambiar contraseña
        if (userData.requiresPasswordChange === true) {
          router.push('/cambiar-password');
          return;
        }
      }
      
      // 4. Redirigir al inicio
      router.push('/inicio');
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Incrementar intentos
      incrementAttempts();
      
      // Mostrar mensaje de error
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err));
      } else {
        setError('Ocurrió un error inesperado. Intenta de nuevo.');
      }
      
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER: ESTADO DE BLOQUEO
  // ============================================

  if (lockoutUntil && Date.now() < lockoutUntil) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-4">
        <StarsBackground speed={0.5} className="absolute inset-0 z-0"/>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10"
        >
          <Card className="w-full max-w-sm bg-card/40 border-border/50 shadow-2xl backdrop-blur-xl p-8 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ShieldAlert className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">Acceso Bloqueado</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Demasiados intentos fallidos. Por seguridad, espera antes de intentar nuevamente.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-3xl font-mono font-bold">
                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tiempo restante</p>
            </div>
            <p className="text-xs text-muted-foreground">
              ¿Olvidaste tu contraseña? Acude a Recursos Humanos.
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // RENDER: CARGANDO USUARIO
  // ============================================

  if (isUserLoading) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
        <StarsBackground speed={0.5} className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: FORMULARIO DE LOGIN
  // ============================================

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <StarsBackground speed={0.5} className="absolute inset-0 z-0"/>

      {/* Botón de créditos */}
      <div className="absolute top-4 left-4 z-10">
        <Dialog>
          <DialogTrigger asChild>
            <ShinyButton className="p-2 aspect-square" aria-label="Ver equipo de desarrollo">
              <Sparkles className="h-5 w-5" />
            </ShinyButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xs bg-card/80 backdrop-blur-lg text-center p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Equipo de Desarrollo</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-primary">
                  <AvatarImage src="https://github.com/LeoHdez.png" alt="Leonardo Hernández" />
                  <AvatarFallback>LH</AvatarFallback>
                </Avatar>
                <p className="font-bold">Leonardo Hernández</p>
                <p className="text-sm text-muted-foreground">Developer</p>
              </div>
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-primary">
                  <AvatarImage src="https://github.com/Noemi-H.png" alt="Noemi Hernández" />
                  <AvatarFallback>NH</AvatarFallback>
                </Avatar>
                <p className="font-bold">Noemi Hernández</p>
                <p className="text-sm text-muted-foreground">Team</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center text-center p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground">
            VIÑOPLASTIC
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Portal de Recursos Humanos
          </p>
        </motion.div>

        {/* Card de Login */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          <Card className="w-full bg-card/40 border-border/50 shadow-2xl backdrop-blur-xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Control de Acceso</h2>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-2 text-left">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="usuario@vinoplastic.com"
                    required 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="bg-background/50 border-border/50 placeholder:text-muted-foreground pl-10"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              {/* Campo Password */}
              <div className="space-y-2 text-left">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    required 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="bg-background/50 border-border/50 placeholder:text-muted-foreground pl-10 pr-10"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              {/* Mensaje de Error */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm">{error}</p>
                </motion.div>
              )}
              
              {/* Contador de intentos */}
              {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && (
                <p className="text-xs text-yellow-500 text-center">
                  Intentos restantes: {MAX_LOGIN_ATTEMPTS - loginAttempts}
                </p>
              )}
              
              {/* Botón Submit */}
              <Button 
                type="submit" 
                className="w-full h-11 font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
              
              {/* Enlaces adicionales */}
              <div className="pt-2 space-y-2">
                <div className="text-center">
                  <Link 
                    href="/activar" 
                    className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                  >
                    ¿Eres empleado? Activa tu cuenta aquí
                  </Link>
                </div>
                
                <div className="text-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card/80 backdrop-blur-lg">
                      <DialogHeader className="items-center text-center">
                        <div className="p-3 bg-amber-400/10 rounded-full w-fit mb-2">
                          <AlertCircle className="h-8 w-8 text-amber-400" />
                        </div>
                        <DialogTitle className="text-xl">Recuperación de Contraseña</DialogTitle>
                        <DialogDescription className="pt-2 text-base">
                          Para restablecer tu contraseña, por favor acude personalmente al departamento de Recursos Humanos.
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ViñoPlastic Inyección S.A de C.V
      </div>
    </div>
  );
}