
const admin = require("firebase-admin");

// --- 1. CONFIGURACIÓN ---
const serviceAccount = require("../../serviceAccountKey.json");
const nombreColeccion = "reglas_ascenso"; // Nueva colección específica para esto

// Inicializar Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 2. DATOS ESTRUCTURADOS (Lógica de Negocio) ---
// He convertido los textos a números para que puedas programar condiciones tipo: 
// if (empleado.calificacion >= regla.min_examen)
const reglasBrutas = [
  {
    "puesto_actual": "OPERADOR DE ACABADOS GP-12 B",
    "puesto_siguiente": "OPERADOR DE ACABADOS GP-12 A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90, 
    "orden_jerarquico": 4
  },
  {
    "puesto_actual": "OPERADOR DE ACABADOS GP-12 C",
    "puesto_siguiente": "OPERADOR DE ACABADOS GP-12 B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "OPERADOR DE ACABADOS GP-12 D",
    "puesto_siguiente": "OPERADOR DE ACABADOS GP-12 C",
    "meses_minimos": 3,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 2
  },
   {
    "puesto_actual": "SUPERVISOR DE ACABADOS - GP12 B",
    "puesto_siguiente": "SUPERVISOR DE ACABADOS - GP12 A",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "SUPERVISOR DE ACABADOS - GP12 C",
    "puesto_siguiente": "SUPERVISOR DE ACABADOS - GP12 B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 80,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "INSPECTOR DE CALIDAD B",
    "puesto_siguiente": "INSPECTOR DE CALIDAD A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 95,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "INSPECTOR DE CALIDAD C",
    "puesto_siguiente": "INSPECTOR DE CALIDAD B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 70,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "INSPECTOR DE CALIDAD D",
    "puesto_siguiente": "INSPECTOR DE CALIDAD C",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 50,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "INGENIERO DE CALIDAD B",
    "puesto_siguiente": "INGENIERO DE CALIDAD A",
    "meses_minimos": 9,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
    },
    {
    "puesto_actual": "INGENIERO DE CALIDAD C",
    "puesto_siguiente": "INGENIERO DE CALIDAD B",
    "meses_minimos": 9,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 85,
    "min_cobertura_matriz": 80,
    "orden_jerarquico": 1
    },
    {
    "puesto_actual": "TÉCNICO DE MANTENIMIENTO B",
    "puesto_siguiente": "TÉCNICO DE MANTENIMIENTO A",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 95,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
    },
    {
    "puesto_actual": "TÉCNICO DE MANTENIMIENTO C",
    "puesto_siguiente": "TÉCNICO DE MANTENIMIENTO B",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 50,
    "orden_jerarquico": 2
    },
    {
    "puesto_actual": "TÉCNICO DE MANTENIMIENTO D",
    "puesto_siguiente": "TÉCNICO DE MANTENIMIENTO C",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
    },
    {
    "puesto_actual": "AUXILIAR DE MANTENIMIENTO B",
    "puesto_siguiente": "AUXILIAR DE MANTENIMIENTO A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
    },
    {
    "puesto_actual": "AUXILIAR DE MANTENIMIENTO C",
    "puesto_siguiente": "AUXILIAR DE MANTENIMIENTO B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 50,
    "orden_jerarquico": 1
    },
    {
    "puesto_actual": "TECNICO DE MANTENIMIENTO DE EDIFICIOS B",
    "puesto_siguiente": "TECNICO DE MANTENIMIENTO DE EDIFICIOS A",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 95,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "TÉCNICO DE MOLDES B",
    "puesto_siguiente": "TÉCNICO DE MOLDES A",
    "meses_minimos": 18,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 4
  },
  {
    "puesto_actual": "TÉCNICO DE MOLDES C",
    "puesto_siguiente": "TÉCNICO DE MOLDES B",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 80,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "TÉCNICO DE MOLDES D",
    "puesto_siguiente": "TÉCNICO DE MOLDES C",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 50,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "TÉCNICO DE MOLDES E",
    "puesto_siguiente": "TÉCNICO DE MOLDES D",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "OPERADOR DE MÁQUINA B",
    "puesto_siguiente": "OPERADOR DE MÁQUINA A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "OPERADOR DE MÁQUINA C",
    "puesto_siguiente": "OPERADOR DE MÁQUINA B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "OPERADOR DE MÁQUINA D",
    "puesto_siguiente": "OPERADOR DE MÁQUINA C",
    "meses_minimos": 3,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "MONTADOR DE MOLDES B",
    "puesto_siguiente": "MONTADOR DE MOLDES A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "MONTADOR DE MOLDES C",
    "puesto_siguiente": "MONTADOR DE MOLDES B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "ASISTENTE DE PRODUCCIÓN B",
    "puesto_siguiente": "ASISTENTE DE PRODUCCIÓN A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "SUPERVISOR DE PRODUCCIÓN B",
    "puesto_siguiente": "SUPERVISOR DE PRODUCCIÓN A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "SUPERVISOR DE PRODUCCIÓN C",
    "puesto_siguiente": "SUPERVISOR DE PRODUCCIÓN B",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 85,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "SUPERVISOR DE PRODUCCIÓN D",
    "puesto_siguiente": "SUPERVISOR DE PRODUCCIÓN C",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "INGENIERO DE PROCESO B",
    "puesto_siguiente": "INGENIERO DE PROCESO A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "INGENIERO DE PROCESO C",
    "puesto_siguiente": "INGENIERO DE PROCESO B",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 85,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "INGENIERO DE PROCESO D",
    "puesto_siguiente": "INGENIERO DE PROCESO C",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "INGENIERO DE PROYECTOS B",
    "puesto_siguiente": "INGENIERO DE PROYECTOS A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "INGENIERO DE PROYECTOS C",
    "puesto_siguiente": "INGENIERO DE PROYECTOS B",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 85,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "INGENIERO DE PROYECTOS D",
    "puesto_siguiente": "INGENIERO DE PROYECTOS C",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "LIDER DE PROYECTOS B",
    "puesto_siguiente": "LIDER DE PROYECTOS A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "LIDER DE PROYECTOS C",
    "puesto_siguiente": "LIDER DE PROYECTOS B",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 85,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DE ALMACÉN B",
    "puesto_siguiente": "AUXILIAR DE ALMACÉN A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 3
  },
  {
    "puesto_actual": "AUXILIAR DE ALMACÉN C",
    "puesto_siguiente": "AUXILIAR DE ALMACÉN B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "AUXILIAR DE ALMACÉN D",
    "puesto_siguiente": "AUXILIAR DE ALMACÉN C",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": null,
    "min_cobertura_matriz": 30,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR ADMINISTRATIVO DE ALMACÉN B",
    "puesto_siguiente": "AUXILIAR ADMINISTRATIVO DE ALMACÉN A",
    "meses_minimos": 12,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "AUXILIAR ADMINISTRATIVO DE ALMACÉN C",
    "puesto_siguiente": "AUXILIAR ADMINISTRATIVO DE ALMACÉN B",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 60,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DE LIMPIEZA B",
    "puesto_siguiente": "AUXILIAR DE LIMPIEZA A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "ANALISTA DE RECLUTAMIENTO Y SELECCIÓN B",
    "puesto_siguiente": "ANALISTA DE RECLUTAMIENTO Y SELECCIÓN A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "METRÓLOGO B",
    "puesto_siguiente": "METRÓLOGO A",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 90,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 2
  },
  {
    "puesto_actual": "METRÓLOGO C",
    "puesto_siguiente": "METRÓLOGO B",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 70,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DEL SGI C",
    "puesto_siguiente": "AUXILIAR DEL SGI B",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 80,
    "min_cobertura_matriz": 80,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DE SUPERVISOR B",
    "puesto_siguiente": "AUXILIAR DE SUPERVISOR A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "MATERIALISTA B",
    "puesto_siguiente": "MATERIALISTA A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "PREPARADOR B",
    "puesto_siguiente": "PREPARADOR A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "CHECK LIST B",
    "puesto_siguiente": "CHECK LIST A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "SCRAP B",
    "puesto_siguiente": "SCRAP A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DE BÁSCULA B",
    "puesto_siguiente": "AUXILIAR DE BÁSCULA A",
    "meses_minimos": 6,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 90,
    "orden_jerarquico": 1
  },
  {
    "puesto_actual": "AUXILIAR DE METROLOGÍA",
    "puesto_siguiente": "METRÓLOGO C",
    "meses_minimos": 8,
    "min_evaluacion_desempeno": 80,
    "min_examen_teorico": 70,
    "min_cobertura_matriz": 70,
    "orden_jerarquico": 1
  }
];


// Función para crear IDs limpios (ej: "operador_acabados_gp12_b")
const crearSlug = (texto) => {
    return texto.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");
};

// --- 3. PROCESO DE CARGA ---
async function subirReglas() {
    console.log(`🚀 Cargando ${reglasBrutas.length} reglas de ascenso...`);
    
    const batch = db.batch();
    
    reglasBrutas.forEach((regla) => {
        // Usamos el puesto ACTUAL como ID del documento.
        // Así, cuando consultes un empleado, buscas su puesto actual en esta colección
        // y obtienes inmediatamente qué necesita para subir.
        const idDoc = crearSlug(regla.puesto_actual);
        const docRef = db.collection(nombreColeccion).doc(idDoc);

        // Agregamos fecha de actualización por control
        const datosFinales = {
            ...regla,
            fecha_actualizacion: new Date()
        };

        batch.set(docRef, datosFinales, { merge: true });
    });

    try {
        await batch.commit();
        console.log("✅ Reglas de ascenso actualizadas correctamente.");
    } catch (error) {
        console.error("❌ Error al subir las reglas:", error);
    }
}

subirReglas();
