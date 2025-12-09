
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let firebaseApp: FirebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApp();
}

function initializeFirebase() {
    return firebaseApp;
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

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

export { initializeApp, getApps, getApp, type FirebaseApp };
export { getAuth, type Auth };
export { getFirestore, type Firestore };
export { getStorage, type FirebaseStorage };

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
export { useMemoFirebase } from '@/hooks/use-memo-firebase';

