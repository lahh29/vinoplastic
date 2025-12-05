
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- 1. CONFIGURACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 2. FUNCIÓN PRINCIPAL ---
async function crearUsuariosDesdePlantilla() {
    console.log("Este script ya no es necesario.");
    console.log("El flujo ha cambiado a un sistema de auto-registro para empleados en la página /activar.");
    console.log("Los empleados ahora pueden crear su propia cuenta usando su ID de empleado.");
    console.log("Para limpiar usuarios creados previamente, ejecuta: npm run limpiar-usuarios");
}

crearUsuariosDesdePlantilla();
