
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// --- 1. CONFIGURACIÓN ---
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const auth = admin.auth();

// --- 2. FUNCIÓN PRINCIPAL ---
async function crearUsuariosDesdePlantilla() {
    console.log("🚀 Iniciando proceso de creación masiva de usuarios...");

    try {
        const plantillaSnapshot = await db.collection('Plantilla').get();
        const usuariosExistentesSnapshot = await db.collection('usuarios').get();

        const empleadosExistentes = new Set();
        usuariosExistentesSnapshot.forEach(doc => {
            if (doc.data().id_empleado) {
                empleadosExistentes.add(doc.data().id_empleado);
            }
        });

        console.log(`🔍 Encontrados ${empleadosExistentes.size} empleados que ya tienen una cuenta de usuario.`);

        const empleadosSinUsuario = [];
        plantillaSnapshot.forEach(doc => {
            const empleado = doc.data();
            if (!empleadosExistentes.has(empleado.id_empleado)) {
                empleadosSinUsuario.push(empleado);
            }
        });
        
        if (empleadosSinUsuario.length === 0) {
            console.log("✅ No hay nuevos empleados para crear usuarios. ¡Todo está al día!");
            return;
        }

        console.log(`⏳ Se crearán cuentas para ${empleadosSinUsuario.length} nuevos empleados.`);
        
        let usuariosCreados = 0;
        const errores = [];

        for (const empleado of empleadosSinUsuario) {
            const id_empleado = empleado.id_empleado;
            const email = `${id_empleado}_empleado@vinoplastic.com`;
            const password = `Vino.2024!`;

            try {
                // Paso 1: Crear cuenta en Firebase Authentication
                const userRecord = await auth.createUser({
                    email: email,
                    password: password,
                    displayName: empleado.nombre_completo
                });
                
                const uid = userRecord.uid;

                // Paso 2: Crear el documento en la colección 'usuarios'
                const usuarioDocRef = db.collection('usuarios').doc(uid);
                await usuarioDocRef.set({
                    id_empleado: id_empleado,
                    nombre: empleado.nombre_completo,
                    email: email,
                    role: 'empleado',
                    requiresPasswordChange: true // Nueva bandera
                });

                usuariosCreados++;
                process.stdout.write(`.`);

            } catch (error) {
                // Manejar errores comunes como email duplicado
                if (error.code === 'auth/email-already-exists') {
                    errores.push(`- El email ${email} (ID: ${id_empleado}) ya existe en Firebase Auth, pero no estaba en la colección 'usuarios'. Se recomienda revisar manualmente.`);
                } else {
                    errores.push(`- Error creando usuario para ID ${id_empleado}: ${error.message}`);
                }
            }
        }

        console.log(`\n\n🎉 ¡Proceso finalizado!`);
        console.log(`   - ✅ Usuarios creados exitosamente: ${usuariosCreados}`);
        if (errores.length > 0) {
            console.log(`   - ❌ Errores encontrados: ${errores.length}`);
            console.log("\n--- DETALLE DE ERRORES ---");
            errores.forEach(err => console.log(err));
            console.log("--------------------------");
        }

    } catch (error) {
        console.error("❌ Error crítico al leer la base de datos:", error);
    }
}

crearUsuariosDesdePlantilla();
