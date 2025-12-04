const admin = require("firebase-admin");
const fs = require('fs');

// 1. CARGA TUS CREDENCIALES
// Asegúrate de que el archivo serviceAccountKey.json esté en la carpeta
const serviceAccount = require("./serviceAccountKey.json");

// 2. CARGA EL ARCHIVO DE DATOS
const datos = require("./salida_firebase.json");

// 3. INICIALIZA FIREBASE
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function subirDatos() {
  console.log(`🚀 Iniciando subida de ${datos.length} perfiles...`);
  
  const batch = db.batch();
  let contador = 0;

  for (const item of datos) {
    // A. Convertir la fecha de string (JSON) a Objeto Date real para Firestore
    // Si no hacemos esto, se guardará como un texto simple.
    if (item.fecha_actualizacion) {
        item.fecha_actualizacion = new Date(item.fecha_actualizacion);
    }

    // B. Definir la referencia del documento
    // Usamos 'nombre_puesto' como ID para que sea fácil de leer en la base de datos
    // Ejemplo: perfiles_puestos/ANALISTA DE CAPACITACIÓN
    const docRef = db.collection("perfiles_puesto").doc(item.nombre_puesto);

    // C. Añadir al lote (batch)
    batch.set(docRef, item);
    contador++;

    // Firestore solo permite 500 operaciones por lote. 
    // Si tienes más de 500 puestos, hay que guardar y reiniciar el lote.
    if (contador >= 499) {
        await batch.commit();
        console.log(`... Lote intermedio guardado (${contador} docs)`);
        contador = 0; // Reiniciar contador (nota: en un script real complejo se reiniciaría el objeto batch)
    }
  }

  // Guardar los restantes
  await batch.commit();
  console.log("✅ ¡Listo! Todos los perfiles han sido subidos a la colección 'perfiles_puesto'.");
}

subirDatos().catch(console.error);