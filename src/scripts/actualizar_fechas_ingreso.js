
const admin = require('firebase-admin');
const fs = require('fs');

// 1. Configuración de Firebase
const serviceAccount = require('../../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. Función para convertir fechas "M/D/YY" a objetos Timestamp de Firestore
function parseAndConvertToTimestamp(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const month = parseInt(parts[0], 10) - 1; 
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    if (year < 100) {
        year += 2000;
    }

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;

    return admin.firestore.Timestamp.fromDate(date);
}


// 3. Función principal para actualizar fechas
async function actualizarFechasDeIngreso() {
    try {
        const rawData = fs.readFileSync('./datos/fecha_ingresos.json', 'utf8');
        const ingresos = JSON.parse(rawData);
        
        let batch = db.batch();
        let count = 0;
        const noEncontrados = [];

        console.log(`Procesando ${ingresos.length} registros de fechas de ingreso...`);

        for (const ingreso of ingresos) {
            const empleadoId = String(ingreso.ID);
            if (!empleadoId) continue;

            const docRef = db.collection('Plantilla').doc(empleadoId);
            const docSnapshot = await docRef.get();

            if (docSnapshot.exists) {
                const fechaTimestamp = parseAndConvertToTimestamp(ingreso.Fecha_Ingreso);
                if (fechaTimestamp) {
                    batch.update(docRef, { fecha_ingreso: fechaTimestamp });
                    count++;
                } else {
                    console.warn(`Formato de fecha inválido para ID ${empleadoId}: ${ingreso.Fecha_Ingreso}`);
                }
            } else {
                noEncontrados.push(empleadoId);
            }

            // Ejecutamos el batch cada 450 operaciones para no exceder el límite de Firestore
            if (count > 0 && count % 450 === 0) {
                await batch.commit();
                console.log(`... Lote de ${count} actualizaciones guardado.`);
                batch = db.batch();
            }
        }

        // Guardar el último lote si queda algo pendiente
        if (count > 0 && count % 450 > 0) {
            await batch.commit();
        }

        console.log(`✅ Éxito: Se han procesado las fechas de ingreso para ${count} empleados.`);
        
        if (noEncontrados.length > 0) {
            console.log("\n⚠️ ATENCIÓN: Los siguientes IDs no se encontraron en la Plantilla y no fueron actualizados:");
            console.log(noEncontrados.join(', '));
        }

    } catch (error) {
        console.error("❌ Error crítico durante la actualización:", error);
    }
}

actualizarFechasDeIngreso();
