const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- CONFIGURACIÓN ---
// Cambia esto al UID del usuario que quieres que sea administrador.
// Lo puedes encontrar en la consola de Firebase > Authentication.
const ADMIN_UID = "5uq0ppoEphRuRt0t8mSBWQxKXAF3"; // UID for leonardo.admin@vinoplastic.com
const ADMIN_EMAIL = "leonardo.admin@vinoplastic.com";
// --------------------

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function setAdminRole() {
    if (!ADMIN_UID) {
        console.error("❌ Error: Debes especificar el ADMIN_UID en este script.");
        return;
    }

    try {
        console.log(`🚀 Asignando rol de 'admin' al usuario con UID: ${ADMIN_UID}...`);

        const userRef = db.collection('usuarios').doc(ADMIN_UID);

        await userRef.set({
            email: ADMIN_EMAIL,
            role: 'admin'
        }, { merge: true });

        console.log("✅ ¡Éxito! El usuario ahora tiene permisos de administrador.");
        console.log("Recuerda que las reglas de seguridad pueden tardar unos minutos en propagarse.");

    } catch (error) {
        console.error("❌ Error al asignar el rol de administrador:", error);
    }
}

setAdminRole();
