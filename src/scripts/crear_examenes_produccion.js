
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

/**
 * Mezcla un array de forma aleatoria (algoritmo de Fisher-Yates).
 * @param {Array} array El array a mezclar.
 * @returns {Array} El array mezclado.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- FUNCIÓN PRINCIPAL ---
async function crearExamenes() {
    console.log("🚀 Iniciando la creación de exámenes de promoción...");

    try {
        // 1. Obtener todas las preguntas disponibles
        console.log("📚 Obteniendo el banco de preguntas desde 'preguntas_limpias'...");
        const preguntasSnapshot = await db.collection('preguntas_limpias').get();
        if (preguntasSnapshot.empty) {
            console.error("❌ Error: La colección 'preguntas_limpias' está vacía. No se pueden crear exámenes.");
            return;
        }
        const todasLasPreguntasIds = preguntasSnapshot.docs.map(doc => doc.id);
        console.log(` -> Se encontraron ${todasLasPreguntasIds.length} preguntas disponibles.`);

        // 2. Iniciar el proceso por lotes
        const batch = db.batch();
        let examenesCreados = 0;

        console.log("\n🛠️  Generando exámenes para cada puesto y nivel...");

        for (const puestoBase of PUESTOS_PRODUCCION) {
            for (const nivel of NIVELES_EXAMEN) {
                
                const puestoActualCompleto = `${puestoBase} ${nivel.de}`;
                const puestoSiguienteCompleto = `${puestoBase} ${nivel.a}`;
                
                const puestoId = crearSlug(puestoActualCompleto);
                
                // Mezclar y seleccionar preguntas
                const preguntasMezcladas = shuffleArray([...todasLasPreguntasIds]);
                const preguntasSeleccionadas = preguntasMezcladas.slice(0, nivel.cantidad);

                if (preguntasSeleccionadas.length < nivel.cantidad) {
                    console.warn(`   ⚠️  Advertencia: No hay suficientes preguntas para el examen de '${puestoActualCompleto}'. Se usarán ${preguntasSeleccionadas.length}.`);
                }

                // Definir el documento del examen
                const examenDoc = {
                    puestoId: puestoId,
                    nombre_examen: `Examen de Promoción: ${puestoActualCompleto} -> ${puestoSiguienteCompleto}`,
                    preguntaIds: preguntasSeleccionadas,
                    fecha_creacion: admin.firestore.FieldValue.serverTimestamp()
                };

                const docRef = db.collection('examenes').doc(puestoId);
                batch.set(docRef, examenDoc);
                examenesCreados++;
            }
        }
        
        // 3. Subir el lote a Firestore
        await batch.commit();

        console.log(`\n🎉 ¡Éxito! Se han creado y guardado ${examenesCreados} exámenes en la colección 'examenes'.`);

    } catch (error) {
        console.error("❌ Error crítico durante la creación de exámenes:", error);
    }
}

crearExamenes();
