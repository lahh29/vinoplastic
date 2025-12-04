
const admin = require('firebase-admin');
const fs = require('fs');

// --- CONFIGURACIÓN ---

// 1. Carga tu llave de servicio
try {
    var serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.error("❌ Error: No se encontró 'serviceAccountKey.json'.");
    process.exit(1);
}

// 2. Inicializa Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Nombres de las colecciones en Firebase
const COL_CATALOGO = 'catalogo_cursos';
const COL_HISTORIAL = 'historial_capacitacion';

// --- FUNCIÓN DE CARGA POR LOTES (BATCH) ---

async function subirColeccion(nombreArchivo, nombreColeccion, campoId) {
    try {
        console.log(`\n📂 Leyendo ${nombreArchivo}...`);
        const rawData = fs.readFileSync(nombreArchivo);
        const datos = JSON.parse(rawData);

        console.log(`🚀 Iniciando carga a la colección: '${nombreColeccion}' (${datos.length} documentos)...`);

        let batch = db.batch();
        let contadorOperaciones = 0;
        let contadorLotes = 0;

        for (const item of datos) {
            // Usamos el campo ID específico como llave del documento
            const docId = item[campoId].toString(); 
            const docRef = db.collection(nombreColeccion).doc(docId);

            batch.set(docRef, item);
            contadorOperaciones++;

            // Límite de Firestore: 500 ops por batch. Usamos 400 por seguridad.
            if (contadorOperaciones >= 400) {
                await batch.commit();
                contadorLotes++;
                process.stdout.write(`.`); // Feedback visual
                batch = db.batch();
                contadorOperaciones = 0;
            }
        }

        // Subir remanentes
        if (contadorOperaciones > 0) {
            await batch.commit();
            console.log(" ✅");
        }

        console.log(`✨ Carga de '${nombreColeccion}' completada.`);

    } catch (error) {
        console.error(`❌ Error subiendo ${nombreArchivo}:`, error.message);
    }
}

// --- EJECUCIÓN PRINCIPAL ---

async function iniciarCarga() {
    console.log("==========================================");
    console.log("🔥 INICIANDO MIGRACIÓN DE CURSOS A FIREBASE");
    console.log("==========================================");

    // 1. Subir Catálogo Maestro
    // El campo ID en el JSON es 'id_curso'
    await subirColeccion('maestro_cursos.json', COL_CATALOGO, 'id_curso');

    // 2. Subir Historial de Empleados
    // El campo ID en el JSON es 'id_empleado'
    await subirColeccion('historial_empleados.json', COL_HISTORIAL, 'id_empleado');

    console.log("\n==========================================");
    console.log("🎉 ¡TODO LISTO! La información está en la nube.");
    console.log("==========================================");
}

iniciarCarga();
