// scripts/create-verification-collection.js

/**
 * Script para crear la colección Plantilla_Verificacion
 * 
 * Ejecutar con: node scripts/create-verification-collection.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// ============================================
// CONFIGURACIÓN
// ============================================

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const SOURCE_COLLECTION = 'Plantilla';
const TARGET_COLLECTION = 'Plantilla_Verificacion';

// ============================================
// HELPERS
// ============================================

function formatDate(date) {
  if (!date) return '';
  
  // Si es Timestamp de Firestore
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toISOString().split('T')[0];
  }
  
  // Si es Date de JavaScript
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  
  // Si es string
  if (typeof date === 'string') {
    const cleaned = date.trim();
    
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
      const [day, month, year] = cleaned.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Formato D/M/YYYY o DD/M/YYYY, etc.
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
      const [day, month, year] = cleaned.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    
    // Intentar parsear como fecha
    try {
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignorar
    }
    
    return cleaned;
  }
  
  return '';
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

function printHeader(text) {
  console.log('\n' + '='.repeat(50));
  console.log('  ' + text);
  console.log('='.repeat(50) + '\n');
}

function printSuccess(text) {
  console.log(`✅ ${text}`);
}

function printError(text) {
  console.log(`❌ ${text}`);
}

function printWarning(text) {
  console.log(`⚠️  ${text}`);
}

function printInfo(text) {
  console.log(`📋 ${text}`);
}

// ============================================
// INICIALIZACIÓN
// ============================================

function initializeFirebaseAdmin() {
  // Verificar archivo de credenciales
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    printError('No se encontró el archivo de credenciales.');
    console.log(`\n   Ruta esperada: ${SERVICE_ACCOUNT_PATH}`);
    console.log('\n📋 Instrucciones:');
    console.log('   1. Ve a Firebase Console > Project Settings > Service Accounts');
    console.log('   2. Click en "Generate New Private Key"');
    console.log('   3. Guarda el archivo como "serviceAccountKey.json" en la carpeta scripts/');
    console.log('\n⚠️  IMPORTANTE: NO subas este archivo a Git!\n');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    
    initializeApp({
      credential: cert(serviceAccount),
    });
    
    printSuccess('Firebase Admin inicializado correctamente');
    return getFirestore();
  } catch (error) {
    printError(`Error al inicializar Firebase: ${error.message}`);
    process.exit(1);
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  printHeader('CREAR COLECCIÓN DE VERIFICACIÓN');

  const db = initializeFirebaseAdmin();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. Verificar colección fuente
    console.log(`\n📂 Verificando colección "${SOURCE_COLLECTION}"...`);
    const sourceRef = db.collection(SOURCE_COLLECTION);
    const sourceSnapshot = await sourceRef.get();

    if (sourceSnapshot.empty) {
      printError(`La colección "${SOURCE_COLLECTION}" está vacía o no existe.`);
      rl.close();
      process.exit(1);
    }

    printSuccess(`Encontrados ${sourceSnapshot.size} documentos en ${SOURCE_COLLECTION}`);

    // 2. Verificar colección destino
    const targetRef = db.collection(TARGET_COLLECTION);
    const targetSnapshot = await targetRef.limit(1).get();

    if (!targetSnapshot.empty) {
      printWarning(`La colección "${TARGET_COLLECTION}" ya existe.`);
      const answer = await askQuestion(rl, '   ¿Deseas sobrescribir los documentos existentes? (s/n): ');
      
      if (answer !== 's' && answer !== 'si' && answer !== 'y' && answer !== 'yes') {
        console.log('\n❌ Operación cancelada.\n');
        rl.close();
        process.exit(0);
      }
    }

    // 3. Analizar campos disponibles
    console.log('\n📊 Analizando estructura de datos...\n');
    
    const firstDoc = sourceSnapshot.docs[0].data();
    const availableFields = Object.keys(firstDoc);
    
    console.log('   Campos disponibles en Plantilla:');
    availableFields.forEach(field => {
      const value = firstDoc[field];
      const type = typeof value;
      const preview = type === 'string' ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` : value;
      console.log(`   - ${field}: ${preview}`);
    });

    // 4. Detectar campo de fecha de nacimiento
    const possibleDateFields = [
      'fecha_nacimiento',
      'fechaNacimiento', 
      'fecha_nac',
      'birthdate',
      'birth_date',
      'Fecha_Nacimiento',
      'FechaNacimiento',
      'FECHA_NACIMIENTO'
    ];
    
    let dateField = null;
    for (const field of possibleDateFields) {
      if (availableFields.includes(field)) {
        dateField = field;
        break;
      }
    }

    if (!dateField) {
      printWarning('No se detectó automáticamente el campo de fecha de nacimiento.');
      console.log('\n   Campos disponibles:');
      availableFields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field}`);
      });
      
      const fieldAnswer = await askQuestion(rl, '\n   Escribe el nombre exacto del campo de fecha de nacimiento: ');
      
      if (availableFields.includes(fieldAnswer)) {
        dateField = fieldAnswer;
      } else {
        printError(`El campo "${fieldAnswer}" no existe.`);
        rl.close();
        process.exit(1);
      }
    }

    console.log(`\n   ✓ Usando campo de fecha: "${dateField}"`);

    // 5. Detectar campo de ID empleado
    const possibleIdFields = [
      'id_empleado',
      'idEmpleado',
      'employee_id',
      'employeeId',
      'ID_Empleado',
      'Id_Empleado',
      'ID_EMPLEADO',
      'numero_empleado',
      'NumeroEmpleado'
    ];
    
    let idField = null;
    for (const field of possibleIdFields) {
      if (availableFields.includes(field)) {
        idField = field;
        break;
      }
    }

    // Si no encuentra, usar el ID del documento
    if (!idField) {
      console.log('   ℹ️  No se encontró campo de ID. Se usará el ID del documento.');
    } else {
      console.log(`   ✓ Usando campo de ID: "${idField}"`);
    }

    // 6. Preview de datos
    console.log('\n📋 Preview de los primeros 5 documentos:\n');
    
    const previewDocs = sourceSnapshot.docs.slice(0, 5);
    let hasErrors = false;
    
    for (const doc of previewDocs) {
      const data = doc.data();
      const empleadoId = idField ? data[idField] : doc.id;
      const fechaNac = formatDate(data[dateField]);
      
      console.log(`   📄 ${empleadoId}`);
      console.log(`      Fecha Nacimiento: ${fechaNac || '⚠️ VACÍO'}`);
      
      if (!fechaNac) {
        hasErrors = true;
      }
      console.log('');
    }

    if (hasErrors) {
      printWarning('Algunos documentos no tienen fecha de nacimiento.');
      console.log('   Estos empleados NO podrán activar su cuenta.\n');
    }

    // 7. Confirmar operación
    const confirmAnswer = await askQuestion(
      rl, 
      `¿Proceder a crear ${sourceSnapshot.size} documentos en "${TARGET_COLLECTION}"? (s/n): `
    );
    
    if (confirmAnswer !== 's' && confirmAnswer !== 'si' && confirmAnswer !== 'y' && confirmAnswer !== 'yes') {
      console.log('\n❌ Operación cancelada.\n');
      rl.close();
      process.exit(0);
    }

    // 8. Crear documentos
    console.log('\n🚀 Creando documentos...\n');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorList = [];
    const now = Timestamp.now();

    // Procesar en batches
    const batchSize = 400; // Dejar margen del límite de 500
    let batch = db.batch();
    let operationsInBatch = 0;
    let batchNumber = 1;
    const totalBatches = Math.ceil(sourceSnapshot.size / batchSize);

    for (const doc of sourceSnapshot.docs) {
      try {
        const data = doc.data();
        const empleadoId = idField ? (data[idField] || doc.id) : doc.id;
        const fechaNacimiento = formatDate(data[dateField]);

        // Si no tiene fecha, saltar
        if (!fechaNacimiento) {
          errorList.push(`${empleadoId}: Sin fecha de nacimiento`);
          skipped++;
          continue;
        }

        // Verificar si ya existe
        const existingDoc = await targetRef.doc(empleadoId.toString()).get();
        const isUpdate = existingDoc.exists;

        const verificationData = {
          id_empleado: empleadoId.toString(),
          fecha_nacimiento: fechaNacimiento,
          cuenta_activa: isUpdate ? (existingDoc.data()?.cuenta_activa || false) : false,
          created_at: isUpdate ? (existingDoc.data()?.created_at || now) : now,
          updated_at: now,
        };

        batch.set(targetRef.doc(empleadoId.toString()), verificationData);
        operationsInBatch++;

        if (isUpdate) {
          updated++;
        } else {
          created++;
        }

        // Si alcanzamos el límite del batch
        if (operationsInBatch >= batchSize) {
          process.stdout.write(`   Ejecutando batch ${batchNumber}/${totalBatches}...`);
          await batch.commit();
          console.log(' ✓');
          
          batch = db.batch();
          operationsInBatch = 0;
          batchNumber++;
        }
      } catch (error) {
        const empleadoId = doc.data()?.[idField] || doc.id;
        errorList.push(`${empleadoId}: ${error.message}`);
        errors++;
      }
    }

    // Ejecutar último batch
    if (operationsInBatch > 0) {
      process.stdout.write(`   Ejecutando batch ${batchNumber}/${totalBatches}...`);
      await batch.commit();
      console.log(' ✓');
    }

    // 9. Resumen
    printHeader('RESUMEN DE OPERACIÓN');
    
    console.log(`   ✅ Documentos creados:      ${created}`);
    console.log(`   🔄 Documentos actualizados: ${updated}`);
    console.log(`   ⏭️  Documentos omitidos:     ${skipped}`);
    console.log(`   ❌ Errores:                 ${errors}`);
    console.log(`   📊 Total procesados:        ${sourceSnapshot.size}`);

    if (errorList.length > 0 && errorList.length <= 20) {
      console.log('\n⚠️  Detalles de problemas:');
      errorList.forEach((err) => console.log(`   - ${err}`));
    } else if (errorList.length > 20) {
      console.log(`\n⚠️  ${errorList.length} documentos con problemas (mostrando primeros 20):`);
      errorList.slice(0, 20).forEach((err) => console.log(`   - ${err}`));
    }

    printSuccess('\n¡Operación completada exitosamente!');

    // 10. Próximos pasos
    printHeader('PRÓXIMOS PASOS');
    
    console.log('1. ✏️  Despliega las nuevas reglas de Firestore');
    console.log('2. 🔧 Actualiza el componente de activación');
    console.log('3. 🧪 Prueba el flujo de activación');
    console.log('4. 🗑️  Elimina serviceAccountKey.json de scripts/');
    console.log('');

  } catch (error) {
    printError(`Error durante la ejecución: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// ============================================
// EJECUTAR
// ============================================

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});