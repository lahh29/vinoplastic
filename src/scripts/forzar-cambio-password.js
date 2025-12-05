
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- 1. CONFIGURACIÓN ---
// UID del usuario al que quieres forzar el cambio de contraseña.
// Encuéntralo en Firebase Console > Authentication.
// POR DEFECTO, ESTÁ EL UID DEL ADMINISTRADOR.
const USER_UID_TO_RESET = "wE0RDmidGBdqTkLO5FqFrIpg6M52"; 

// --- 2. INICIALIZACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 3. FUNCIÓN PRINCIPAL ---
async function forcePasswordChange() {
    if (!USER_UID_TO_RESET) {
        console.error("❌ Error: Debes especificar el UID del usuario en la constante USER_UID_TO_RESET.");
        return;
    }

    try {
        console.log(`🚀 Forzando cambio de contraseña para el usuario con UID: ${USER_UID_TO_RESET}...`);

        const userDocRef = db.collection('usuarios').doc(USER_UID_TO_RESET);
        
        // Verificamos si el documento existe antes de actualizarlo.
        const docSnap = await userDocRef.get();
        if (!docSnap.exists) {
            console.error(`❌ Error: No se encontró ningún usuario con el UID especificado en la colección 'usuarios'.`);
            console.log("Asegúrate de que el UID es correcto y que el usuario existe en Firestore.");
            return;
        }
        
        // Actualizamos el campo para requerir el cambio de contraseña.
        await userDocRef.update({
            requiresPasswordChange: true
        });

        console.log("✅ ¡Éxito! El usuario ha sido marcado para cambiar su contraseña en el próximo inicio de sesión.");
        console.log("Por favor, recarga la página en tu navegador para ver el cambio.");

    } catch (error) {
        console.error("❌ Error al actualizar el documento del usuario:", error);
    }
}

forcePasswordChange();
