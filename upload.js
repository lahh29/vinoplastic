// upload.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ===================================================================
// 1. CONFIGURACIÓN INICIAL (Asegúrate de tener serviceAccountKey.json)
// ===================================================================
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ===================================================================
// 2. FUNCIÓN PRINCIPAL DE PROCESAMIENTO
// ===================================================================

/**
 * Normaliza una cadena de texto a un formato limpio para usar como clave JSON.
 * (Ej: "OPCIÓN A " -> "OPCION_A")
 * @param {string} key La clave original.
 * @returns {string} La clave limpia.
 */
function normalizeKey(key) {
    if (!key) return null;
    return key.toUpperCase().trim().replace(/ /g, '_');
}

/**
 * Valida, corrige y estructura los datos de una pregunta.
 * @param {Object} rawQuestion La pregunta tal como viene en el JSON.
 * @returns {Object|null} La pregunta estructurada o null si es inválida.
 */
function processQuestion(rawQuestion) {
    const normalized = {};
    for (const key in rawQuestion) {
        const cleanKey = normalizeKey(key);
        if (cleanKey) {
            normalized[cleanKey] = rawQuestion[key];
        }
    }

    const { PREGUNTA, RESPUESTA, OPCIÓN_A, OPCIÓN_B, OPCIÓN_C } = normalized;
    
    // ⚠️ VALIDACIÓN CRÍTICA: La pregunta y la respuesta son obligatorias.
    if (!PREGUNTA || !RESPUESTA || !OPCIÓN_A || !OPCIÓN_B) { 
        console.warn(`[OMITIDA] Pregunta incompleta o mal formada: ${PREGUNTA || 'Sin PREGUNTA'}`);
        return null; // Ignorar si falta información esencial
    }
    
    // 3. ESTRUCTURA SÓLIDA: Convertir a un modelo de datos robusto
    const structuredQuestion = {
        question: PREGUNTA.trim(),
        correctAnswerKey: RESPUESTA.trim().toUpperCase(),
        options: {},
        type: 'multiple-choice', // Definimos un tipo para escalabilidad
        tags: []
    };

    // Construir el objeto de opciones
    if (OPCIÓN_A) structuredQuestion.options.A = OPCIÓN_A.trim();
    if (OPCIÓN_B) structuredQuestion.options.B = OPCIÓN_B.trim();
    if (OPCIÓN_C) structuredQuestion.options.C = OPCIÓN_C.trim();
    
    // Limpieza final de la clave de respuesta (solo letras mayúsculas)
    if (!['A', 'B', 'C'].includes(structuredQuestion.correctAnswerKey)) {
        console.error(`[ERROR] Clave de respuesta inválida para: ${structuredQuestion.question}. Clave dada: ${structuredQuestion.correctAnswerKey}.`);
        structuredQuestion.correctAnswerKey = 'A'; // Corrección de fallback (o podrías usar null)
    }

    return structuredQuestion;
}

/**
 * Carga el archivo y sube los documentos a Firebase.
 */
async function uploadData() {
    const filePath = path.join(__dirname, 'preguntas.json');
    const collectionName = 'preguntas_limpias';
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ ERROR: Archivo no encontrado en la ruta: ${filePath}`);
        return;
    }

    console.log(`✅ Leyendo datos de ${filePath}...`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(rawData);

    console.log(`⏳ Iniciando procesamiento y carga de ${questions.length} preguntas a la colección: ${collectionName}`);
    
    const batch = db.batch();
    let uploadCount = 0;

    questions.forEach((rawQuestion, index) => {
        const cleanedQuestion = processQuestion(rawQuestion);
        
        if (cleanedQuestion) {
            // El ID del documento será autogenerado para evitar colisiones
            const docRef = db.collection(collectionName).doc(); 
            batch.set(docRef, cleanedQuestion);
            uploadCount++;
        }
    });

    try {
        await batch.commit();
        console.log(`\n🎉 Carga masiva exitosa. Se subieron ${uploadCount} documentos de ${questions.length} totales.`);
    } catch (error) {
        console.error(`\n❌ ERROR CRÍTICO al subir batch: ${error.message}`);
    }
}

uploadData();