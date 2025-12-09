'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';

// 1. Inicialización Singleton (Para uso directo como: import { storage } from '@/firebase')
// Esto asegura que solo haya una instancia de Firebase corriendo
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Exportamos las instancias para usarlas directamente en componentes simples
export { app, auth, firestore, storage };

// 2. Funciones de ayuda para el Provider (Tu estructura original)
// Mantenemos esto para que tu <FirebaseProvider> siga funcionando correctamente
export function initializeFirebase() {
  // Como ya inicializamos 'app' arriba, simplemente devolvemos sus SDKs
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export interface UserAuthHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// 3. Re-exportaciones (Mantenemos tus exportaciones originales)
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export { useMemoFirebase };
