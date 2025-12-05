
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- 1. CONFIGURACIÓN ---
// UID del usuario al que quieres modificar.
// Encuéntralo en Firebase Console > Authentication.
const USER_UID_TO_MODIFY = "Z6rLLILLgrWNY7q4kPjpWboZOQ63"; 

// Cambia esto a `true` para forzar el cambio, o `false` para desactivarlo.
const REQUIRES_CHANGE = false; 

// --- 2. INICIALIZACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 3. FUNCIÓN PRINCIPAL ---
async function forcePasswordChange() {
    if (!USER_UID_TO_MODIFY) {
        console.error("❌ Error: Debes especificar el UID del usuario en la constante USER_UID_TO_MODIFY.");
        return;
    }

    try {
        console.log(`🚀 Actualizando el estado de cambio de contraseña para el usuario con UID: ${USER_UID_TO_MODIFY}...`);
        console.log(`   Nuevo estado para 'requiresPasswordChange': ${REQUIRES_CHANGE}`);

        const userDocRef = db.collection('usuarios').doc(USER_UID_TO_MODIFY);
        
        const docSnap = await userDocRef.get();
        if (!docSnap.exists) {
            console.error(`❌ Error: No se encontró ningún usuario con el UID especificado en la colección 'usuarios'.`);
            console.log("Asegúrate de que el UID es correcto y que el usuario existe en Firestore.");
            return;
        }
        
        await userDocRef.update({
            requiresPasswordChange: REQUIRES_CHANGE
        });

        console.log(`✅ ¡Éxito! El estado del usuario ha sido actualizado a 'requiresPasswordChange: ${REQUIRES_CHANGE}'.`);
        console.log("Si estabas atascado, recarga la página en tu navegador para ver el cambio.");

    } catch (error) {
        console.error("❌ Error al actualizar el documento del usuario:", error);
    }
}

forcePasswordChange();
