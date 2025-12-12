// firebase/client-provider.tsx
'use client';

import React, { 
  ReactNode, 
  useState, 
  useEffect, 
  useCallback 
} from 'react';
import { FirebaseProvider } from './provider';
import { getFirebaseServices, resetFirebaseInitialization } from './index';
import type { FirebaseServices } from './index';
import { Loader2, RefreshCw, WifiOff, AlertCircle } from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface FirebaseClientProviderProps {
  children: ReactNode;
  /** Componente personalizado de loading */
  loadingFallback?: ReactNode;
  /** Componente personalizado de error */
  errorFallback?: ReactNode;
  /** Tiempo máximo de espera para inicialización (ms) */
  timeout?: number;
  /** Número máximo de reintentos automáticos */
  maxRetries?: number;
  /** Delay entre reintentos (ms) */
  retryDelay?: number;
}

interface InitState {
  services: FirebaseServices | null;
  error: Error | null;
  isLoading: boolean;
  retryCount: number;
}

type ErrorType = 'network' | 'config' | 'timeout' | 'unknown';

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_TIMEOUT = 10000; // 10 segundos
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1500;

// ============================================
// HELPERS
// ============================================

function getErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('config') || message.includes('api key') || message.includes('invalid')) {
    return 'config';
  }
  if (message.includes('timeout')) {
    return 'timeout';
  }
  return 'unknown';
}

function getErrorMessage(errorType: ErrorType): { title: string; description: string } {
  switch (errorType) {
    case 'network':
      return {
        title: 'Sin Conexión',
        description: 'No se pudo conectar con los servicios. Verifica tu conexión a internet.',
      };
    case 'config':
      return {
        title: 'Error de Configuración',
        description: 'Hay un problema con la configuración de la aplicación. Contacta al administrador.',
      };
    case 'timeout':
      return {
        title: 'Tiempo de Espera Agotado',
        description: 'La conexión tardó demasiado. Por favor, intenta nuevamente.',
      };
    default:
      return {
        title: 'Error de Conexión',
        description: 'No se pudieron cargar los servicios necesarios. Intenta nuevamente.',
      };
  }
}

function getErrorIcon(errorType: ErrorType) {
  switch (errorType) {
    case 'network':
      return <WifiOff className="h-6 w-6 text-destructive" />;
    case 'config':
      return <AlertCircle className="h-6 w-6 text-destructive" />;
    default:
      return <AlertCircle className="h-6 w-6 text-destructive" />;
  }
}

// ============================================
// COMPONENTE DE LOADING
// ============================================

function DefaultLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Iniciando aplicación</p>
          <p className="text-xs text-muted-foreground mt-1">Conectando con los servicios...</p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE DE ERROR
// ============================================

interface DefaultErrorFallbackProps {
  error: Error;
  onRetry: () => void;
  isRetrying: boolean;
  retryCount: number;
  maxRetries: number;
}

function DefaultErrorFallback({ 
  error, 
  onRetry, 
  isRetrying,
  retryCount,
  maxRetries,
}: DefaultErrorFallbackProps) {
  const errorType = getErrorType(error);
  const { title, description } = getErrorMessage(errorType);
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg space-y-6">
          {/* Icono */}
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            {getErrorIcon(errorType)}
          </div>
          
          {/* Mensaje */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          
          {/* Botones */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg 
                         hover:bg-primary/90 transition-colors font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reintentando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Intentar de Nuevo
                </>
              )}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              disabled={isRetrying}
              className="w-full px-4 py-2 text-sm text-muted-foreground 
                         hover:text-foreground transition-colors
                         disabled:opacity-50"
            >
              Recargar Página Completa
            </button>
          </div>
          
          {/* Contador de reintentos */}
          {retryCount > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Intentos realizados: {retryCount} / {maxRetries + 1}
            </p>
          )}
          
          {/* Detalles del error (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Detalles técnicos
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs text-left overflow-auto max-h-32 font-mono">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function FirebaseClientProvider({ 
  children,
  loadingFallback,
  errorFallback,
  timeout = DEFAULT_TIMEOUT,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelay = DEFAULT_RETRY_DELAY,
}: FirebaseClientProviderProps) {
  const [state, setState] = useState<InitState>({
    services: null,
    error: null,
    isLoading: true,
    retryCount: 0,
  });
  
  const [isRetrying, setIsRetrying] = useState(false);

  // Función de inicialización
  const initializeServices = useCallback(async (isRetry: boolean = false) => {
    // Si es un retry, resetear el estado de inicialización de Firebase
    if (isRetry) {
      setIsRetrying(true);
      resetFirebaseInitialization();
      
      // Pequeño delay antes de reintentar
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    try {
      // Crear promise con timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout: La inicialización tardó demasiado tiempo.'));
        }, timeout);
      });

      const initPromise = new Promise<FirebaseServices>((resolve, reject) => {
        try {
          // Pequeño delay para asegurar que estamos en el cliente
          setTimeout(() => {
            try {
              const services = getFirebaseServices();
              resolve(services);
            } catch (error) {
              reject(error);
            }
          }, 0);
        } catch (error) {
          reject(error);
        }
      });

      // Race entre inicialización y timeout
      const services = await Promise.race([initPromise, timeoutPromise]);
      
      setState(prev => ({
        services,
        error: null,
        isLoading: false,
        retryCount: isRetry ? prev.retryCount + 1 : 0,
      }));
      
    } catch (error) {
      console.error('[FirebaseClientProvider] Error inicializando:', error);
      
      const currentError = error instanceof Error ? error : new Error('Error desconocido');
      
      setState(prev => ({
        services: null,
        error: currentError,
        isLoading: false,
        retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount,
      }));
      
    } finally {
      setIsRetrying(false);
    }
  }, [timeout, retryDelay]);

  // Efecto de inicialización
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (!mounted) return;
      await initializeServices(false);
    };
    
    init();

    return () => {
      mounted = false;
    };
  }, [initializeServices]);

  // Auto-retry en caso de error de red
  useEffect(() => {
    if (
      state.error && 
      !state.isLoading && 
      !isRetrying &&
      state.retryCount < maxRetries
    ) {
      const errorType = getErrorType(state.error);
      
      // Solo auto-retry en errores de red o timeout
      if (errorType === 'network' || errorType === 'timeout') {
        const retryTimer = setTimeout(() => {
          initializeServices(true);
        }, retryDelay * (state.retryCount + 1)); // Backoff exponencial simple
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, [state.error, state.isLoading, state.retryCount, isRetrying, maxRetries, retryDelay, initializeServices]);

  // Handler para retry manual
  const handleRetry = useCallback(() => {
    if (!isRetrying) {
      setState(prev => ({ ...prev, isLoading: true }));
      initializeServices(true);
    }
  }, [isRetrying, initializeServices]);

  // ========== RENDER ==========

  // Estado de carga
  if (state.isLoading && !isRetrying) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return <DefaultLoadingFallback />;
  }

  // Estado de error
  if (state.error || !state.services) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }
    
    return (
      <DefaultErrorFallback
        error={state.error || new Error('Servicios no disponibles')}
        onRetry={handleRetry}
        isRetrying={isRetrying}
        retryCount={state.retryCount}
        maxRetries={maxRetries}
      />
    );
  }

  // Servicios disponibles - renderizar provider
  return (
    <FirebaseProvider
      firebaseApp={state.services.firebaseApp}
      firestore={state.services.firestore}
      auth={state.services.auth}
      storage={state.services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}

// ============================================
// EXPORT POR DEFECTO
// ============================================

export default FirebaseClientProvider;