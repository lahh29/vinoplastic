
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// --- ÚNICA INSTANCIA DE SERVICIOS ---
let firebaseApp: FirebaseApp;
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

/**
 * Función centralizada para obtener los servicios de Firebase.
 * Asegura que Firebase se inicialice una sola vez.
 * @returns {object} Objeto con las instancias de los servicios.
 */
export function getFirebaseServices() {
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export function initiateEmailSignIn(auth: Auth, email: string, password: string) {
    return firebaseSignInWithEmailAndPassword(auth, email, password);
}

// Exportaciones explícitas de tipos y funciones necesarias
export { type FirebaseApp };
export { type Auth };
export { type Firestore };
export { type FirebaseStorage };

export { FirebaseProvider, FirebaseClientProvider, useFirebase, useAuth, useFirestore, useStorage, useFirebaseApp } from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from './non-blocking-updates';
export { useUser } from './auth/use-user';
export { FirestorePermissionError } from './errors';
export { errorEmitter } from './error-emitter';
export { useMemoFirebase } from '@/hooks/use-memo-firebase';
