
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- INICIALIZACIÓN DE FIREBASE ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const auth = admin.auth();

// --- FUNCIÓN PRINCIPAL ---
async function eliminarUsuariosEmpleados() {
    console.log("🔥 Iniciando proceso para eliminar usuarios con rol 'empleado'...");

    try {
        const usuariosSnapshot = await db.collection('usuarios').where('role', '==', 'empleado').get();

        if (usuariosSnapshot.empty) {
            console.log("✅ No se encontraron usuarios con el rol 'empleado'. No hay nada que borrar.");
            return;
        }

        const usuariosAEliminar = [];
        usuariosSnapshot.forEach(doc => {
            usuariosAEliminar.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🗑️ Se encontraron ${usuariosAEliminar.length} usuarios para eliminar.`);

        let eliminadosAuth = 0;
        const errores = [];

        // Eliminar de Firebase Authentication
        // Firebase recomienda hacer esto en lotes de 1000
        const uidsParaBorrar = usuariosAEliminar.map(u => u.id);
        
        if (uidsParaBorrar.length > 0) {
            const resultadosAuth = await auth.deleteUsers(uidsParaBorrar);
            
            eliminadosAuth = resultadosAuth.successCount;
            resultadosAuth.errors.forEach(err => {
                errores.push(`- Error en Auth para UID ${err.uid}: ${err.error.message}`);
            });

            console.log(`- ✅ ${eliminadosAuth} usuarios eliminados de Firebase Authentication.`);
            if(resultadosAuth.failureCount > 0) {
                console.log(`- ❌ Fallo al eliminar ${resultadosAuth.failureCount} usuarios de Firebase Authentication.`);
            }
        }


        // Eliminar de Firestore
        console.log("🗑️ Eliminando documentos correspondientes en Firestore...");
        const batch = db.batch();
        usuariosAEliminar.forEach(user => {
            const docRef = db.collection('usuarios').doc(user.id);
            batch.delete(docRef);
        });
        await batch.commit();
        console.log(`- ✅ ${usuariosAEliminar.length} documentos eliminados de la colección 'usuarios'.`);


        console.log("\n🎉 ¡Proceso de limpieza finalizado!");
        if (errores.length > 0) {
            console.log("\n--- DETALLE DE ERRORES ---");
            errores.forEach(err => console.log(err));
            console.log("--------------------------");
        }

    } catch (error) {
        console.error("❌ Error crítico durante el proceso de eliminación:", error);
    }
}

eliminarUsuariosEmpleados();
