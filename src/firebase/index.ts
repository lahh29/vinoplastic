
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

function initializeFirebase() {
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

const firebaseApp = initializeFirebase();
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

// Explicitly export from each module to avoid conflicts
export { initializeApp, getApps, getApp, type FirebaseApp };
export { getAuth, type Auth };
export { getFirestore, type Firestore };
export { getStorage, type FirebaseStorage };

export {
    FirebaseProvider,
    FirebaseClientProvider,
    useFirebase,
    useAuth,
    useFirestore,
    useStorage,
    useFirebaseApp,
} from './provider';

export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from './non-blocking-updates';
export { useUser } from './auth/use-user';
export { FirestorePermissionError } from './errors';
export { errorEmitter } from './error-emitter';
export { useMemoFirebase } from '@/hooks/use-memo-firebase';
