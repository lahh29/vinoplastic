'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  type Auth, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type UserCredential
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// ============================================
// TIPOS
// ============================================

export interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// ============================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================

function validateConfig(config: Record<string, unknown>): config is FirebaseConfig {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingKeys = requiredKeys.filter(key => !config[key]);
  
  if (missingKeys.length > 0) {
    console.error(
      `[Firebase] Configuración incompleta. Faltan las siguientes variables: ${missingKeys.join(', ')}`
    );
    return false;
  }
  
  return true;
}

// ============================================
// SINGLETON DE SERVICIOS
// ============================================

let firebaseServices: FirebaseServices | null = null;
let initializationError: Error | null = null;
let isInitializing = false;

/**
 * Inicializa Firebase de forma segura.
 * Solo se ejecuta en el cliente y maneja errores apropiadamente.
 */
function initializeFirebase(): FirebaseServices {
  // Si ya hay servicios inicializados, retornarlos
  if (firebaseServices) {
    return firebaseServices;
  }

  // Si hubo un error previo, lanzarlo
  if (initializationError) {
    throw initializationError;
  }

  // Prevenir inicialización múltiple simultánea
  if (isInitializing) {
    throw new Error('[Firebase] Inicialización en progreso. Espera un momento.');
  }

  isInitializing = true;

  try {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      throw new Error('[Firebase] Firebase solo puede inicializarse en el cliente.');
    }

    // Validar configuración
    if (!validateConfig(firebaseConfig)) {
      throw new Error('[Firebase] La configuración de Firebase es inválida o está incompleta.');
    }

    // Inicializar o reutilizar la app
    let app: FirebaseApp;
    
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.info('[Firebase] App inicializada correctamente.');
    } else {
      app = getApp();
      console.info('[Firebase] Reutilizando app existente.');
    }

    // Obtener servicios
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);

    // Guardar en singleton
    firebaseServices = {
      firebaseApp: app,
      auth,
      firestore,
      storage,
    };

    return firebaseServices;

  } catch (error) {
    initializationError = error instanceof Error 
      ? error 
      : new Error('[Firebase] Error desconocido durante la inicialización.');
    
    console.error('[Firebase] Error de inicialización:', initializationError.message);
    throw initializationError;
    
  } finally {
    isInitializing = false;
  }
}

// ============================================
// FUNCIONES PÚBLICAS
// ============================================

/**
 * Obtiene los servicios de Firebase.
 * Inicializa Firebase si es necesario.
 * @throws {Error} Si la inicialización falla
 */
export function getFirebaseServices(): FirebaseServices {
  return initializeFirebase();
}

/**
 * Verifica si Firebase está inicializado.
 */
export function isFirebaseInitialized(): boolean {
  return firebaseServices !== null;
}

/**
 * Reinicia la inicialización de Firebase (útil para testing o recovery).
 */
export function resetFirebaseInitialization(): void {
  firebaseServices = null;
  initializationError = null;
  isInitializing = false;
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Inicia sesión con email y contraseña.
 * @param email - Email del usuario
 * @param password - Contraseña del usuario
 * @returns Promise con las credenciales del usuario
 */
export async function signInWithEmail(
  email: string, 
  password: string
): Promise<UserCredential> {
  const { auth } = getFirebaseServices();
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function signOut(): Promise<void> {
  const { auth } = getFirebaseServices();
  return firebaseSignOut(auth);
}

/**
 * Suscribe a cambios en el estado de autenticación.
 * @param callback - Función a ejecutar cuando cambie el estado
 * @returns Función para cancelar la suscripción
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  const { auth } = getFirebaseServices();
  return onAuthStateChanged(auth, callback);
}

/**
 * Obtiene el usuario actual de forma síncrona.
 * Puede ser null si no hay sesión o si Firebase aún está cargando.
 */
export function getCurrentUser(): User | null {
  if (!firebaseServices) return null;
  return firebaseServices.auth.currentUser;
}

// ============================================
// ACCESO DIRECTO A SERVICIOS (LAZY)
// ============================================

/**
 * Obtiene la instancia de Auth.
 * Inicializa Firebase si es necesario.
 */
export function getAuthInstance(): Auth {
  return getFirebaseServices().auth;
}

/**
 * Obtiene la instancia de Firestore.
 * Inicializa Firebase si es necesario.
 */
export function getFirestoreInstance(): Firestore {
  return getFirebaseServices().firestore;
}

/**
 * Obtiene la instancia de Storage.
 * Inicializa Firebase si es necesario.
 */
export function getStorageInstance(): FirebaseStorage {
  return getFirebaseServices().storage;
}

// ============================================
// RE-EXPORTACIONES DE TIPOS
// ============================================

export type { FirebaseApp };
export type { Auth };
export type { Firestore };
export type { FirebaseStorage };
export type { User, UserCredential };

// ============================================
// RE-EXPORTACIONES DE MÓDULOS INTERNOS
// ============================================

export { 
  FirebaseProvider, 
  FirebaseClientProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useStorage, 
  useFirebaseApp, 
  useUser 
} from './provider';

export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

export { 
  setDocumentNonBlocking, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from './non-blocking-updates';

export { FirestorePermissionError } from './errors';
export { errorEmitter } from './error-emitter';
export { useMemoFirebase } from '@/hooks/use-memo-firebase';