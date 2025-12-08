
const fs = require('fs');
const admin = require('firebase-admin'); // Opcional: si quieres subirlo directo, ver nota al final.

// 1. CARGAR ARCHIVOS
// Asegúrate de que los nombres coincidan con tus archivos locales
const maestro = require('../datos/maestro_cursos.json');
const taller = require('../datos/cursos_taller.json'); // Renombré 'cursos taller.json' a 'cursos_taller.json' para evitar errores de sintaxis

// 2. FUNCIÓN DE NORMALIZACIÓN
// Esta función es clave para que coincidan textos con pequeñas diferencias (tildes, mayúsculas, espacios)
function normalizarTexto(texto) {
    if (!texto) return "";
    return texto
        .toString()
        .toLowerCase() // Todo a minúsculas
        .trim() // Quitar espacios al inicio y final
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos (á -> a)
        .replace(/´/g, "'") // Cambiar tildes raras por apóstrofe estándar
        .replace(/‘/g, "'")
        .replace(/’/g, "'")
        .replace(/\s+/g, ' '); // Eliminar dobles espacios internos
}

// 3. CREAR DICCIONARIO DE MAESTRO
// Clave: Nombre normalizado -> Valor: ID del curso
const mapaCursos = {};
maestro.forEach(curso => {
    const nombreNorm = normalizarTexto(curso.nombre_oficial);
    mapaCursos[nombreNorm] = curso.id_curso;
});

// 4. PROCESAR Y AGRUPAR POR PUESTO
const perfilesMap = {};
const errores = [];

taller.forEach(fila => {
    const puesto = fila.Puesto;
    const nombreCursoTaller = fila["Curso Asignado"];
    
    // Inicializar el puesto si no existe
    if (!perfilesMap[puesto]) {
        perfilesMap[puesto] = new Set(); // Usamos Set para evitar cursos duplicados
    }

    // Buscar ID
    const nombreBusqueda = normalizarTexto(nombreCursoTaller);
    const idEncontrado = mapaCursos[nombreBusqueda];

    if (idEncontrado) {
        perfilesMap[puesto].add(idEncontrado);
    } else {
        // REGISTRO DE ERRORES: Cursos que están en Taller pero NO en Maestro
        // Nota: "RPS", "ELECTROEROSION" y "MI-GER-001" darán error porque no están en tu maestro.json
        if (!errores.includes(`Curso no encontrado: "${nombreCursoTaller}" para el puesto "${puesto}"`)) {
            errores.push(`Curso no encontrado: "${nombreCursoTaller}" para el puesto "${puesto}"`);
        }
    }
});

// 5. GENERAR ESTRUCTURA FINAL PARA FIREBASE
const resultadoFinal = Object.keys(perfilesMap).map(puesto => {
    return {
        nombre_puesto: puesto,
        cursos_obligatorios: Array.from(perfilesMap[puesto]), // Convertir Set a Array
        fecha_actualizacion: new Date() // Objeto fecha real para Firebase
    };
});

// 6. GUARDAR RESULTADO EN JSON (Para revisión antes de subir)
const jsonSalida = JSON.stringify(resultadoFinal, null, 2);
fs.writeFileSync('./datos/salida_firebase.json', jsonSalida);

console.log("✅ Proceso terminado.");
console.log(`🔹 Se generaron ${resultadoFinal.length} perfiles de puesto.`);
console.log(`⚠️  Se encontraron ${errores.length} cursos sin coincidencia en el maestro (ver 'errores.txt').`);

// Guardar log de errores para que sepas qué cursos faltan dar de alta en el maestro
if (errores.length > 0) {
    fs.writeFileSync('errores.txt', errores.join('\n'));
}
// Agrega esto al final del script anterior si deseas subirlo automáticamente
/*
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function subirAFirebase() {
    const batch = db.batch();
    
    resultadoFinal.forEach(doc => {
        // Usamos el nombre del puesto como ID del documento para evitar duplicados, 
        // o deja que firebase genere uno auto con db.collection(...).doc()
        const docRef = db.collection('perfiles_puestos').doc(doc.nombre_puesto); 
        batch.set(docRef, doc);
    });

    await batch.commit();
    console.log("🚀 Datos subidos exitosamente a Firebase");
}

subirAFirebase();
*/
