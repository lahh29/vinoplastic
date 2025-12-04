const admin = require('firebase-admin');
const fs = require('fs');

// 1. Configuración de Firebase
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ---------------- HERRAMIENTAS DE LIMPIEZA ----------------

// A. Convertir fechas "M/D/YY" a objetos Date
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    const month = parseInt(parts[0], 10) - 1; 
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    if (year < 100) year += 2000;

    return new Date(year, month, day);
}

// B. Normalizar Departamentos (Acentos consistentes)
function normalizarDepartamento(depto) {
    if (!depto) return "SIN DEPARTAMENTO";
    const d = depto.toUpperCase().trim();
    if (d === "ALMACEN") return "ALMACÉN";
    if (d === "LOGISTICA") return "LOGÍSTICA";
    if (d === "PRODUCCION") return "PRODUCCIÓN";
    if (d === "DIRECCION") return "DIRECCIÓN";
    return d;
}

// C. Procesar Calificaciones (Texto -> Número y Estatus)
function procesarCalificacion(scoreStr) {
    let valor = null;
    let estatus = "Evaluado";
    let texto = scoreStr || "Pendiente";

    if (texto === "Pendiente" || texto === "") {
        estatus = "Pendiente";
        valor = null;
    } else if (typeof texto === 'string' && texto.includes('%')) {
        valor = parseFloat(texto.replace('%', ''));
    } else if (!isNaN(texto)) {
        valor = parseFloat(texto);
    }

    return {
        texto: texto,
        valor: valor,
        estatus: estatus
    };
}

// ---------------- FUNCIÓN PRINCIPAL ----------------

async function uploadContratos() {
    try {
        const rawData = fs.readFileSync('./contratos.json', 'utf8');
        const contratos = JSON.parse(rawData);
        
        const batch = db.batch();
        let count = 0;
        let batchCount = 0;

        console.log(`Procesando ${contratos.length} registros con nueva estructura...`);

        for (const contrato of contratos) {
            
            // 1. Corrección de nombres específicos (si persiste el error)
            if (String(contrato.ID) === "4010") {
                contrato.Nombre = "HERNANDEZ HERNANDEZ ADAN ULISES";
            }

            // 2. Procesar las 3 calificaciones por separado
            const eval1 = procesarCalificacion(contrato["Calificación Primera Evaluacion"]);
            const eval2 = procesarCalificacion(contrato["Calificación Segunda Evaluacion"]);
            const eval3 = procesarCalificacion(contrato["Calificación Tercera Evaluacion"]);

            // 3. Estructura del Documento para Firestore
            const docData = {
                id_empleado: String(contrato.ID),
                nombre_completo: contrato.Nombre,
                departamento: normalizarDepartamento(contrato.Departamento), // Nuevo campo
                
                fechas_contrato: {
                    ingreso: parseDate(contrato["Fecha de ingreso"]),
                    termino: parseDate(contrato["Fecha de termino de contrato"])
                },
                
                // Objeto detallado de evaluaciones
                evaluaciones: {
                    primera: {
                        fecha_programada: parseDate(contrato["Fecha Primera Evaluación"]),
                        calificacion_texto: eval1.texto,
                        calificacion_valor: eval1.valor,
                        estatus: eval1.estatus
                    },
                    segunda: {
                        fecha_programada: parseDate(contrato["Fecha Segunda Evaluación"]),
                        calificacion_texto: eval2.texto,
                        calificacion_valor: eval2.valor,
                        estatus: eval2.estatus
                    },
                    tercera: {
                        fecha_programada: parseDate(contrato["Fecha Tercera Evaluación"]),
                        calificacion_texto: eval3.texto,
                        calificacion_valor: eval3.valor,
                        estatus: eval3.estatus
                    }
                },
                
                metadata: {
                    actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
                    version_estructura: "2.0 (Con Depto y 3 Evals)"
                }
            };

            // 4. Preparar Batch
            const docRef = db.collection('Contratos').doc(String(contrato.ID));
            batch.set(docRef, docData);
            
            count++;
            batchCount++;

            // 5. Ejecutar Batch si llegamos al límite
            if (batchCount >= 450) {
                await batch.commit();
                console.log(`... Guardado lote intermedio de ${batchCount} registros.`);
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`✅ Éxito Total: ${count} contratos actualizados correctamente.`);

    } catch (error) {
        console.error("❌ Error crítica:", error);
    }
}

uploadContratos();