'use client';

import React, { 
  createContext, 
  useContext, 
  ReactNode, 
  useMemo, 
  useState, 
  useEffect,
  useCallback 
} from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// ============================================
// TIPOS E INTERFACES
// ============================================

/**
 * Props del FirebaseProvider
 */
export interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  /** Componente a mostrar mientras se verifica la autenticación */
  loadingComponent?: ReactNode;
  /** Componente a mostrar si hay error de inicialización */
  errorComponent?: ReactNode;
}

/**
 * Estado del usuario de autenticación
 */
export interface AuthState {
  /** Usuario actual (null si no autenticado) */
  user: User | null;
  /** True mientras se verifica el estado de autenticación */
  isLoading: boolean;
  /** Error de autenticación si ocurrió */
  error: FirebaseError | Error | null;
  /** True si el estado de auth ya fue determinado al menos una vez */
  isInitialized: boolean;
}

/**
 * Estado completo del contexto de Firebase
 */
export interface FirebaseContextState {
  /** Indica si todos los servicios de Firebase están disponibles */
  isReady: boolean;
  /** Instancia de FirebaseApp */
  firebaseApp: FirebaseApp | null;
  /** Instancia de Firestore */
  firestore: Firestore | null;
  /** Instancia de Auth */
  auth: Auth | null;
  /** Instancia de Storage */
  storage: FirebaseStorage | null;
  /** Estado de autenticación */
  authState: AuthState;
  /** Fuerza una recarga del estado de auth */
  refreshAuth: () => void;
}

/**
 * Resultado del hook useFirebase con servicios garantizados
 */
export interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

/**
 * Resultado del hook useFirebase completo
 */
export interface UseFirebaseResult extends FirebaseServices {
  user: User | null;
  isUserLoading: boolean;
  isAuthInitialized: boolean;
  userError: FirebaseError | Error | null;
}

/**
 * Resultado del hook useUser
 */
export interface UseUserResult {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: FirebaseError | Error | null;
  /** True si hay un usuario autenticado */
  isAuthenticated: boolean;
}

// ============================================
// CONTEXTO
// ============================================

const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
  loadingComponent,
  errorComponent,
}) => {
  // Estado de autenticación
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FirebaseError | Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Contador para forzar refresh
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Función para forzar recarga del estado de auth
  const refreshAuth = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Suscripción al estado de autenticación
  useEffect(() => {
    // Validar que auth existe
    if (!auth) {
      setError(new Error('Auth instance not provided to FirebaseProvider'));
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
        setIsInitialized(true);
        setError(null);
      },
      (authError) => {
        console.error('[FirebaseProvider] Auth state error:', authError);
        setError(authError);
        setIsLoading(false);
        setIsInitialized(true);
        setUser(null);
      }
    );

    return () => unsubscribe();
  }, [auth, refreshCounter]);

  // Verificar que todos los servicios estén disponibles
  const isReady = useMemo(() => {
    return !!(firebaseApp && firestore && auth && storage);
  }, [firebaseApp, firestore, auth, storage]);

  // Valor del contexto memoizado
  const contextValue = useMemo((): FirebaseContextState => ({
    isReady,
    firebaseApp: isReady ? firebaseApp : null,
    firestore: isReady ? firestore : null,
    auth: isReady ? auth : null,
    storage: isReady ? storage : null,
    authState: {
      user,
      isLoading,
      error,
      isInitialized,
    },
    refreshAuth,
  }), [
    isReady,
    firebaseApp,
    firestore,
    auth,
    storage,
    user,
    isLoading,
    error,
    isInitialized,
    refreshAuth,
  ]);

  // Mostrar error si los servicios no están disponibles
  if (!isReady && errorComponent) {
    return <>{errorComponent}</>;
  }

  // Mostrar loading mientras se inicializa auth (opcional)
  if (isLoading && !isInitialized && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      {isReady && <FirebaseErrorListener />}
      {children}
    </FirebaseContext.Provider>
  );
};

// ============================================
// HOOKS
// ============================================

/**
 * Hook interno para acceder al contexto.
 * No lanza error, retorna undefined si no está disponible.
 */
function useFirebaseContext(): FirebaseContextState | undefined {
  return useContext(FirebaseContext);
}

/**
 * Hook para verificar si Firebase está disponible sin lanzar error.
 * Útil para renderizado condicional.
 */
export function useFirebaseStatus(): { 
  isReady: boolean; 
  isAuthLoading: boolean;
  isAuthInitialized: boolean;
  hasError: boolean;
} {
  const context = useFirebaseContext();
  
  if (!context) {
    return { 
      isReady: false, 
      isAuthLoading: true,
      isAuthInitialized: false,
      hasError: false,
    };
  }
  
  return {
    isReady: context.isReady,
    isAuthLoading: context.authState.isLoading,
    isAuthInitialized: context.authState.isInitialized,
    hasError: !!context.authState.error,
  };
}

/**
 * Hook para obtener el estado del usuario.
 * No lanza error si no hay Provider.
 */
export function useUser(): UseUserResult {
  const context = useFirebaseContext();
  
  if (!context) {
    console.warn('[useUser] Hook usado fuera de FirebaseProvider');
    return {
      user: null,
      isLoading: true,
      isInitialized: false,
      error: null,
      isAuthenticated: false,
    };
  }
  
  return {
    user: context.authState.user,
    isLoading: context.authState.isLoading,
    isInitialized: context.authState.isInitialized,
    error: context.authState.error,
    isAuthenticated: !!context.authState.user,
  };
}

/**
 * Hook para obtener solo el usuario (simplificado).
 * Retorna null si no hay usuario o si está cargando.
 */
export function useCurrentUser(): User | null {
  const { user, isLoading } = useUser();
  return isLoading ? null : user;
}

/**
 * Hook para obtener todos los servicios de Firebase.
 * LANZA ERROR si se usa fuera del Provider o si los servicios no están listos.
 * Usar useFirebaseStatus primero si necesitas verificar disponibilidad.
 */
export function useFirebase(): UseFirebaseResult {
  const context = useFirebaseContext();
  
  if (!context) {
    throw new Error(
      '[useFirebase] Este hook debe usarse dentro de un FirebaseProvider. ' +
      'Asegúrate de que tu componente esté envuelto en <FirebaseClientProvider>.'
    );
  }
  
  if (!context.isReady) {
    throw new Error(
      '[useFirebase] Los servicios de Firebase no están disponibles. ' +
      'Verifica que FirebaseProvider reciba todas las props correctamente.'
    );
  }
  
  // En este punto sabemos que los servicios existen
  return {
    firebaseApp: context.firebaseApp!,
    firestore: context.firestore!,
    auth: context.auth!,
    storage: context.storage!,
    user: context.authState.user,
    isUserLoading: context.authState.isLoading,
    isAuthInitialized: context.authState.isInitialized,
    userError: context.authState.error,
  };
}

/**
 * Hook seguro para obtener servicios de Firebase.
 * Retorna null si no están disponibles en lugar de lanzar error.
 */
export function useFirebaseSafe(): UseFirebaseResult | null {
  const context = useFirebaseContext();
  
  if (!context || !context.isReady) {
    return null;
  }
  
  return {
    firebaseApp: context.firebaseApp!,
    firestore: context.firestore!,
    auth: context.auth!,
    storage: context.storage!,
    user: context.authState.user,
    isUserLoading: context.authState.isLoading,
    isAuthInitialized: context.authState.isInitialized,
    userError: context.authState.error,
  };
}

/**
 * Hook para obtener la instancia de Auth.
 * LANZA ERROR si no está disponible.
 */
export function useAuth(): Auth {
  const { auth } = useFirebase();
  return auth;
}

/**
 * Hook para obtener la instancia de Firestore.
 * LANZA ERROR si no está disponible.
 */
export function useFirestore(): Firestore {
  const { firestore } = useFirebase();
  return firestore;
}

/**
 * Hook para obtener la instancia de Storage.
 * LANZA ERROR si no está disponible.
 */
export function useStorage(): FirebaseStorage {
  const { storage } = useFirebase();
  return storage;
}

/**
 * Hook para obtener la instancia de FirebaseApp.
 * LANZA ERROR si no está disponible.
 */
export function useFirebaseApp(): FirebaseApp {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
}

/**
 * Hook para forzar una recarga del estado de autenticación.
 */
export function useRefreshAuth(): () => void {
  const context = useFirebaseContext();
  
  if (!context) {
    return () => {
      console.warn('[useRefreshAuth] No hay FirebaseProvider disponible');
    };
  }
  
  return context.refreshAuth;
}

// ============================================
// RE-EXPORTACIÓN
// ============================================

export { FirebaseClientProvider } from './client-provider';

// Exportar el contexto para casos avanzados
export { FirebaseContext };