
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- CONFIGURACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- DEFINICIONES ---
const PUESTOS_PRODUCCION = [
    "OPERADOR DE MÁQUINA",
    "SCRAP",
    "MATERIALISTA",
    "AUXILIAR DE BÁSCULA",
    "CHECK LIST",
    "AUXILIAR DE SUPERVISOR"
];

const NIVELES_EXAMEN = [
    { de: 'D', a: 'C', cantidad: 15 },
    { de: 'C', a: 'B', cantidad: 25 },
    { de: 'B', a: 'A', cantidad: 35 }
];

// --- FUNCIONES AUXILIARES ---

/**
 * Función para crear un slug limpio para usar como ID.
 * @param {string} texto El texto a limpiar.
 * @returns {string} El texto convertido en slug.
 */
const crearSlug = (texto) => {
    return texto.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");
};

// --- FUNCIÓN PRINCIPAL ---
async function crearExamenes() {
    console.log("🚀 Iniciando la creación de REGLAS de examen de promoción...");

    try {
        const totalPreguntas = (await db.collection('preguntas_limpias').get()).size;
        if (totalPreguntas === 0) {
             console.error("❌ Error: La colección 'preguntas_limpias' está vacía. No se pueden crear exámenes.");
             return;
        }
        console.log(`📚 Banco de preguntas disponible: ${totalPreguntas} preguntas.`);

        const batch = db.batch();
        let examenesCreados = 0;

        console.log("\n🛠️  Generando reglas de examen para cada puesto y nivel...");

        for (const puestoBase of PUESTOS_PRODUCCION) {
            for (const nivel of NIVELES_EXAMEN) {
                
                const puestoActualCompleto = `${puestoBase} ${nivel.de}`;
                const puestoSiguienteCompleto = `${puestoBase} ${nivel.a}`;
                
                const puestoId = crearSlug(puestoActualCompleto);
                
                if(nivel.cantidad > totalPreguntas){
                    console.warn(`   ⚠️  Advertencia: La cantidad de preguntas solicitada (${nivel.cantidad}) para el examen de '${puestoActualCompleto}' es mayor que el total de preguntas disponibles (${totalPreguntas}). Se usará el máximo disponible.`);
                }
                
                // Definir el documento del examen con las reglas
                const examenDoc = {
                    puestoId: puestoId,
                    nombre_examen: `Examen de Promoción: ${puestoActualCompleto} -> ${puestoSiguienteCompleto}`,
                    cantidad_preguntas: Math.min(nivel.cantidad, totalPreguntas), // Usar la cantidad solicitada o el máximo disponible
                    fecha_creacion: admin.firestore.FieldValue.serverTimestamp()
                };

                const docRef = db.collection('examenes').doc(puestoId);
                batch.set(docRef, examenDoc);
                examenesCreados++;
            }
        }
        
        // Subir el lote a Firestore
        await batch.commit();

        console.log(`\n🎉 ¡Éxito! Se han creado y guardado ${examenesCreados} reglas de examen en la colección 'examenes'.`);
        console.log("   Ahora, cada vez que un empleado tome un examen, las preguntas se seleccionarán aleatoriamente del banco.");

    } catch (error) {
        console.error("❌ Error crítico durante la creación de exámenes:", error);
    }
}

crearExamenes();
