
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from '@/firebase/config';

// Inicializar Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Obtener la instancia de Firestore
const db = getFirestore(app);

// Exportar para que se pueda usar en otros archivos
export { app, db };
