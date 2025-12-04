const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inicializarPromociones() {
    try {
        console.log("Buscando candidatos elegibles...");
        
        const snapshot = await db.collection('Plantilla').get();
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const puesto = data.puesto?.titulo || "";

            if (puesto.includes("OPERADOR DE ACABADOS GP-12")) {
                
                const promocionRef = db.collection('Promociones').doc(doc.id);
                
                const expediente = {
                    id_empleado: data.id_empleado,
                    nombre: data.nombre_completo,
                    puesto_actual: puesto,
                    
                    fecha_ultimo_cambio: null,
                    evaluacion_practica: null,
                    examen_teorico: 0,
                    
                    cobertura_cursos: Math.floor(Math.random() * (100 - 60) + 60),
                    
                    metadata: {
                        creado_el: admin.firestore.FieldValue.serverTimestamp()
                    }
                };

                batch.set(promocionRef, expediente, { merge: true });
                count++;
            }
        });

        await batch.commit();
        console.log(`✅ Se inicializaron ${count} expedientes en la colección 'Promociones'.`);

    } catch (error) {
        console.error("Error:", error);
    }
}

inicializarPromociones();
