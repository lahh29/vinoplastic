// components/auth/auth-guard.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { Sidebar } from '@/components/ui/sidebar';
import { IdleTimeoutDialog } from '@/components/ui/idle-timeout-dialog';
import { Notifications } from '@/components/ui/notifications';

// ============================================
// TIPOS
// ============================================

export type UserRole = 'admin' | 'lector' | 'empleado';

export interface UserData {
  id: string;
  uid: string;
  email: string;
  nombre?: string;
  role: UserRole;
  requiresPasswordChange?: boolean;
  isActive?: boolean;
  id_empleado?: string;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

// ============================================
// CONSTANTES DE RUTAS
// ============================================

const PUBLIC_ROUTES = ['/login', '/activar'] as const;
const PASSWORD_CHANGE_ROUTE = '/cambiar-password';

const ROLE_ROUTES: Record<UserRole, { allowed: string[]; default: string }> = {
  admin: {
    allowed: ['/inicio', '/rh', '/catalogo', '/reportes', '/ajustes', '/api'],
    default: '/inicio',
  },
  lector: {
    allowed: ['/inicio', '/catalogo', '/reportes'],
    default: '/inicio',
  },
  empleado: {
    allowed: ['/portal'],
    default: '/portal',
  },
};

// ============================================
// HELPERS
// ============================================

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isPasswordChangeRoute(pathname: string): boolean {
  return pathname === PASSWORD_CHANGE_ROUTE;
}

function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  const roleConfig = ROLE_ROUTES[role];
  if (!roleConfig) return false;
  
  return roleConfig.allowed.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_ROUTES[role]?.default || '/login';
}

// ============================================
// COMPONENTE DE LOADING
// ============================================

function LoadingScreen({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <StarsBackground speed={0.2} className="absolute inset-0 z-0" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// LAYOUT CON SIDEBAR
// ============================================

interface MainLayoutProps {
  children: React.ReactNode;
  userData: UserData | null;
}

function MainLayout({ children, userData }: MainLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full">
      <StarsBackground speed={0.2} className="absolute inset-0 z-0" />
      <IdleTimeoutDialog />
      <Sidebar />
      <main className="relative z-10 flex-1 overflow-auto p-4 sm:p-6 lg:p-8 sm:ml-20">
        {/* Notifications solo si hay usuario */}
        {userData && <Notifications userId={userData.uid} />}
        {children}
      </main>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isUserLoading, isInitialized } = useUser();
  const firestore = useFirestore();

  // Estado para controlar la redirección
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Referencia al documento del usuario
  const userDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'usuarios', user.uid) : null),
    [user?.uid, firestore]
  );

  // Datos del usuario desde Firestore
  const { 
    data: userData, 
    isLoading: isDataLoading, 
    error: userDataError 
  } = useDoc<UserData>(userDocRef);

  // Determinar estados de carga
  const isLoading = isUserLoading || (user && isDataLoading);
  const isPublic = isPublicRoute(pathname);
  const isPasswordChange = isPasswordChangeRoute(pathname);

  // ============================================
  // LÓGICA DE REDIRECCIÓN
  // ============================================

  const determineRedirection = useCallback((): string | null => {
    // Rutas públicas: no redirigir, a menos que el usuario ya esté autenticado
    if (isPublic) {
      if (user && userData && !userData.requiresPasswordChange) {
        return getDefaultRouteForRole(userData.role);
      }
      return null;
    }

    // No hay usuario autenticado: ir a login
    if (!user) {
      return '/login';
    }

    // Esperando datos del usuario
    if (!userData) {
      // Si hay error al cargar datos, ir a login
      if (userDataError) {
        console.error('[AuthGuard] Error loading user data:', userDataError);
        return '/login';
      }
      return null; // Esperar datos
    }

    // Usuario desactivado
    if (userData.isActive === false) {
      return '/login';
    }

    // Necesita cambiar contraseña
    if (userData.requiresPasswordChange) {
      if (!isPasswordChange) {
        return PASSWORD_CHANGE_ROUTE;
      }
      return null;
    }

    // Ya no necesita cambiar contraseña pero está en esa página
    if (isPasswordChange && !userData.requiresPasswordChange) {
      return getDefaultRouteForRole(userData.role);
    }

    // Verificar permisos de rol
    if (!isRouteAllowedForRole(pathname, userData.role)) {
      return getDefaultRouteForRole(userData.role);
    }

    return null;
  }, [user, userData, userDataError, pathname, isPublic, isPasswordChange]);

  // Ejecutar redirección
  useEffect(() => {
    // Esperar a que se inicialice la autenticación
    if (!isInitialized || isLoading) return;

    const redirectTo = determineRedirection();

    if (redirectTo && redirectTo !== pathname) {
      setIsRedirecting(true);
      router.replace(redirectTo);
    } else {
      setIsRedirecting(false);
      setHasCheckedAuth(true);
    }
  }, [isInitialized, isLoading, determineRedirection, pathname, router]);

  // ============================================
  // RENDER
  // ============================================

  // Todavía cargando autenticación
  if (!isInitialized || isUserLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // Rutas públicas: renderizar sin layout
  if (isPublic) {
    // Si hay usuario autenticado en ruta pública, mostrar loader mientras redirige
    if (user && userData && !userData.requiresPasswordChange) {
      return <LoadingScreen message="Redirigiendo..." />;
    }
    return <>{children}</>;
  }

  // No hay usuario: no mostrar nada (se está redirigiendo a login)
  if (!user) {
    return <LoadingScreen message="Redirigiendo al login..." />;
  }

  // Cargando datos del usuario
  if (isDataLoading && !userData) {
    return <LoadingScreen message="Cargando perfil..." />;
  }

  // Error al cargar datos del usuario
  if (userDataError && !userData) {
    return <LoadingScreen message="Error al cargar perfil..." />;
  }

  // Usuario existe pero no tiene datos en Firestore (cuenta incompleta)
  if (user && !userData && !isDataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <StarsBackground speed={0.2} className="absolute inset-0 z-0" />
        <div className="relative z-10 max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold">Cuenta Incompleta</h2>
          <p className="text-muted-foreground text-sm">
            Tu cuenta de usuario no está configurada correctamente. 
            Por favor, contacta al departamento de Recursos Humanos.
          </p>
          <button
            onClick={() => {
              // Sign out y redirigir
              router.push('/login');
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  // Página de cambio de contraseña (sin layout completo)
  if (isPasswordChange && userData?.requiresPasswordChange) {
    return <>{children}</>;
  }

  // Redirigiendo
  if (isRedirecting || !hasCheckedAuth) {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  // Todo OK: renderizar con layout
  return (
    <MainLayout userData={userData}>
      {children}
    </MainLayout>
  );
}