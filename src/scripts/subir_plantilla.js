const admin = require('firebase-admin');
const fs = require('fs');

// 1. Configuración de Firebase
// (Si ya inicializaste la app en otro script corriendo simultáneamente, esto podría variar, 
// pero para correrlo por separado está perfecto así).
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 2. Función para normalizar Departamentos (Poner acentos faltantes)
function normalizarDepartamento(depto) {
    if (!depto) return "SIN DEPARTAMENTO";
    const d = depto.toUpperCase().trim();
    
    // Mapeo de correcciones
    if (d === "ALMACEN") return "ALMACÉN";
    if (d === "LOGISTICA") return "LOGÍSTICA";
    if (d === "PRODUCCION") return "PRODUCCIÓN";
    if (d === "DIRECCION") return "DIRECCIÓN";
    
    return d;
}

// 3. Función principal
async function uploadPlantilla() {
    try {
        const rawData = fs.readFileSync('./plantilla_qro.json', 'utf8');
        const empleados = JSON.parse(rawData);
        
        const batch = db.batch();
        let count = 0;
        let batchCount = 0; // Contador para controlar el límite de 500 ops por batch

        console.log(`Procesando ${empleados.length} registros de plantilla...`);

        for (const emp of empleados) {
            
            // --- LIMPIEZA DE DATOS ---

            // A. Corrección ID 4010 (El error persistente)
            let nombreFinal = emp.NOMBRE;
            if (emp.ID === "4010" || emp.ID === 4010) {
                nombreFinal = "HERNANDEZ HERNANDEZ ADAN ULISES";
                console.log(`-> Corregido nombre para ID 4010`);
            }

            // B. Preparar datos
            const docData = {
                id_empleado: String(emp.ID), // Aseguramos que sea string
                nombre_completo: nombreFinal,
                puesto: {
                    departamento: normalizarDepartamento(emp.DEPARTAMENTO),
                    area: emp.ÁREA,
                    titulo: emp.PUESTO,
                    turno: String(emp.TURNO) // Guardamos como string para evitar problemas con "01" vs 1
                },
                metadata: {
                    origen: "plantilla_qro.json",
                    fecha_carga: admin.firestore.FieldValue.serverTimestamp()
                }
            };

            // C. Referencia al documento
            // Usamos el ID del empleado como llave del documento
            const docRef = db.collection('Plantilla').doc(String(emp.ID));
            batch.set(docRef, docData);
            
            count++;
            batchCount++;

            // Firestore tiene un límite de 500 operaciones por batch.
            // Si tu archivo crece mucho, hay que guardar y reiniciar el batch.
            if (batchCount >= 450) {
                await batch.commit();
                console.log(`... Guardado lote intermedio de ${batchCount} documentos.`);
                batchCount = 0;
                // Reiniciamos batch (en versiones nuevas de SDK se crea uno nuevo automáticamente, 
                // pero es mejor prevenir recreando la instancia si fuera necesario o usando lógica de loop)
            }
        }

        // Guardar el remanente final
        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`✅ Éxito: Se han subido ${count} empleados a la colección 'Plantilla'.`);

    } catch (error) {
        console.error("❌ Error subiendo la plantilla:", error);
    }
}

uploadPlantilla();