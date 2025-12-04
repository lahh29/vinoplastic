
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- 1. CONFIGURACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const nombreColeccion = 'dias_festivos';

// --- 2. DATOS: DÍAS FESTIVOS OFICIALES DE MÉXICO ---
const diasFestivos = [
    // --- Restantes de 2025 ---
    { fecha: new Date('2025-09-16T06:00:00.000Z'), nombre: 'Día de la Independencia' },
    { fecha: new Date('2025-11-17T06:00:00.000Z'), nombre: 'Aniversario de la Revolución Mexicana' },
    { fecha: new Date('2025-12-25T06:00:00.000Z'), nombre: 'Navidad' },

    // --- Completos de 2026 ---
    { fecha: new Date('2026-01-01T06:00:00.000Z'), nombre: 'Año Nuevo' },
    { fecha: new Date('2026-02-02T06:00:00.000Z'), nombre: 'Día de la Constitución' },
    { fecha: new Date('2026-03-16T06:00:00.000Z'), nombre: 'Natalicio de Benito Juárez' },
    { fecha: new Date('2026-05-01T06:00:00.000Z'), nombre: 'Día del Trabajo' },
    { fecha: new Date('2026-09-16T06:00:00.000Z'), nombre: 'Día de la Independencia' },
    { fecha: new Date('2026-11-16T06:00:00.000Z'), nombre: 'Aniversario de la Revolución Mexicana' },
    { fecha: new Date('2026-12-25T06:00:00.000Z'), nombre: 'Navidad' }
];

// Función para crear un ID único y legible (ej: '2025_09_16_dia_independencia')
const crearIdUnico = (fecha, nombre) => {
    const y = fecha.getUTCFullYear();
    const m = (fecha.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = fecha.getUTCDate().toString().padStart(2, '0');
    const nombreSlug = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    return `${y}_${m}_${d}_${nombreSlug}`;
};


// --- 3. PROCESO DE CARGA ---
async function subirDiasFestivos() {
    console.log(`🚀 Cargando ${diasFestivos.length} días festivos en la colección '${nombreColeccion}'...`);
    
    const batch = db.batch();
    
    diasFestivos.forEach((festivo) => {
        const docId = crearIdUnico(festivo.fecha, festivo.nombre);
        const docRef = db.collection(nombreColeccion).doc(docId);
        
        batch.set(docRef, {
            ...festivo,
            fecha: admin.firestore.Timestamp.fromDate(festivo.fecha)
        });
    });

    try {
        await batch.commit();
        console.log(`✅ ¡Éxito! Se han subido ${diasFestivos.length} días festivos.`);
        console.log("Los cambios se reflejarán en el calendario de vacaciones.");
    } catch (error) {
        console.error("❌ Error al subir los días festivos:", error);
    }
}

subirDiasFestivos();
