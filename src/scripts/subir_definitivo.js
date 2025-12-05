const admin = require("firebase-admin");

// --- 1. CONFIGURACIÓN ---
const serviceAccount = require("./serviceAccountKey.json");
const nombreColeccion = "plan_formacion";

// Inicializar Firebase
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// --- 2. LOS DATOS (Hardcoded para evitar errores de archivo) ---
const datosBrutos = [
  { "ID": "3624", "Nombre": "ALONSO MORENO GIOVANNA GUADALUPE", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3626", "Nombre": "FLORES MORENO OSCAR ARCENIO", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3627", "Nombre": "TRUJILLO VEGA MARIA SOLEDAD", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3632", "Nombre": "HERNANDEZ DE LA CRUZ MARIA ELENA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3637", "Nombre": "AGUILAR VICENCIO DAVID", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3639", "Nombre": "HERNANDEZ TORRES JULISSA YAMILE", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3646", "Nombre": "PERFECTO NEPOMUCENO MARIA GUADALUPE", "Área": "SGI", "Departamento": "CALIDAD", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3650", "Nombre": "TELLES MORALES MAURICIO ADAN", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3663", "Nombre": "HERNANDEZ MARTINEZ EZEQUIEL", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3669", "Nombre": "DE LUNA CASTILLO ANA BERENICE", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3671", "Nombre": "JIMENEZ ROMAN CRISTHIAN RICARDO", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3672", "Nombre": "GALLARDO CHAVEZ ODILIA", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ENERO", "Estatus": "ENTREGADO" },
  { "ID": "3678", "Nombre": "ESCOBEDO RODRIGUEZ JOSE DAVID", "Área": "PROYECTOS", "Departamento": "PROYECTOS", "Mes Auditable": "FEBRERO", "Estatus": "ENTREGADO" },
  { "ID": "3680", "Nombre": "MUÑOZ ESPINOZA ERIKA PATRICIA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "FEBRERO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3694", "Nombre": "PEREZ BAHENA ALEJANDRA", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "FEBRERO", "Estatus": "ENTREGADO" },
  { "ID": "3698", "Nombre": "ROMERO ARIAS DIANA LAURA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "FEBRERO", "Estatus": "ENTREGADO" },
  { "ID": "3706", "Nombre": "VALLADARES MARTINEZ CRISTIAN", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "FEBRERO", "Estatus": "ENTREGADO" },
  { "ID": "3734", "Nombre": "CORTEZ HILARIO CARLOS ALBERTO", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "MARZO", "Estatus": "ENTREGADO" },
  { "ID": "3737", "Nombre": "BAHENA AGUILAR DAVID", "Área": "PRODUCCIÓN MONTAJE", "Departamento": "PRODUCCIÓN", "Mes Auditable": "MARZO", "Estatus": "ENTREGADO" },
  { "ID": "3738", "Nombre": "RAMIREZ MORENO VICTOR ALBERTO", "Área": "PRODUCCIÓN MONTAJE", "Departamento": "PRODUCCIÓN", "Mes Auditable": "MARZO", "Estatus": "ENTREGADO" },
  { "ID": "3742", "Nombre": "RIVERA CHAVEZ JUAN MIGUEL", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "MARZO", "Estatus": "ENTREGADO" },
  { "ID": "3745", "Nombre": "JIMENEZ DE LA CRUZ ELVIRA", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "MARZO", "Estatus": "ENTREGADO" },
  { "ID": "3754", "Nombre": "HERNANDEZ CAMACHO LILIANA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3756", "Nombre": "GUERRERO MEJIA YARELI", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3760", "Nombre": "LEON CABRERA JESUS CANTORVERI", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3764", "Nombre": "GONZALEZ RAMIREZ ISRAEL", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3766", "Nombre": "SANCHEZ CERVANTES JESUS ANDRES", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3772", "Nombre": "MORENO ROMERO OSMAR", "Área": "PRODUCCIÓN ADMTVO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "SIN ENTREGAR" },
  { "ID": "3773", "Nombre": "PEREZ UGALDE KARLA MARIANA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3775", "Nombre": "VEGA REYNA CHRISTIAN MANUEL", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3776", "Nombre": "ROJAS SANCHEZ ELIZABETH", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3780", "Nombre": "SUAREZ HERNANDEZ DANIEL SANTIAGO", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3783", "Nombre": "PACHECO VEGA MARIA GUADALUPE", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3785", "Nombre": "FLORES OLVERA FERNANDO", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3787", "Nombre": "HERNANDEZ VELASCO ALBERTO", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3788", "Nombre": "SANTA CRUZ GALVEZ CHRISTIAN", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3790", "Nombre": "GONZALEZ CARMONA GUADALUPE", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "ABRIL", "Estatus": "ENTREGADO" },
  { "ID": "3796", "Nombre": "ALVARADO COSME ANGEL ALBERTO", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "MAYO", "Estatus": "ENTREGADO" },
  { "ID": "3801", "Nombre": "MORALES PARRA EDUARDO", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "MAYO", "Estatus": "ENTREGADO" },
  { "ID": "3803", "Nombre": "MARQUEZ EVANGELISTA YERANI", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3809", "Nombre": "SIXTOS PINEDA LUIS ANGEL", "Área": "PRODUCCIÓN ADMTVO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3811", "Nombre": "FERRUSCA MENDEZ SUSANA", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3816", "Nombre": "GALICIA ROJAS JONATAN", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3818", "Nombre": "CALZADA HERNANDEZ MARIAM XIMENA", "Área": "RECURSOS HUMANOS", "Departamento": "RECURSOS HUMANOS", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3819", "Nombre": "GOMEZ TOVAR MA. ARCELIA", "Área": "RECURSOS HUMANOS", "Departamento": "RECURSOS HUMANOS", "Mes Auditable": "JUNIO", "Estatus": "ENTREGADO" },
  { "ID": "3830", "Nombre": "RAMOS ORTIZ JUAN CARLOS", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3831", "Nombre": "ARTEAGA MEJIA SARAHI", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3832", "Nombre": "JIMENEZ AGUILLON DIEGO DAVID", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3836", "Nombre": "CORONEL GALVAN DALILA", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3837", "Nombre": "GARCIA LOPEZ MARIANA PAOLA", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JULIO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3842", "Nombre": "FLORES MORANDO OBDULIA", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3843", "Nombre": "DIAZ DIAZ CARLOS DANIEL", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3846", "Nombre": "GONZALEZ VARGAS KATHERINE NAOMI", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3853", "Nombre": "LEÓN TORRES MARIA VANESSA", "Área": "RECURSOS HUMANOS", "Departamento": "RECURSOS HUMANOS", "Mes Auditable": "JULIO", "Estatus": "ENTREGADO" },
  { "ID": "3870", "Nombre": "SANCHEZ LUNA MOIRA DARELI", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "JULIO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3881", "Nombre": "GARCIA DE LA CRUZ VICTORIA EDITH", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3882", "Nombre": "RICO RODRIGUEZ MARIA BIBIANA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3883", "Nombre": "AGUILAR HERNANDEZ SAMARA ODETTE", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3884", "Nombre": "DE SANTIAGO RAMIREZ DANIELA", "Área": "RECURSOS HUMANOS", "Departamento": "RECURSOS HUMANOS", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3889", "Nombre": "HERNANDEZ ANSELMO BRAYAN", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3890", "Nombre": "OLGUIN GONZALEZ JESUS YAEL", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3891", "Nombre": "CANDIA BAUTISTA ARTURO", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3893", "Nombre": "MORENO RUBIO JORGE EMMANUEL", "Área": "PRODUCCIÓN MONTAJE", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3897", "Nombre": "GONZALEZ GALLARETA VIANNEY", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3898", "Nombre": "ORTIZ BARRERA NATALY", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3899", "Nombre": "URIBE VELAZQUEZ MARINA", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3909", "Nombre": "MORELOS MARTINEZ NATIVIDAD", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3914", "Nombre": "QUINTO GASCA ITSEL", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3916", "Nombre": "GONZALEZ MARQUEZ AGUSTIN", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3920", "Nombre": "MARTINEZ ROJAS JORGE DANIEL", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3930", "Nombre": "LUNA SANCHEZ ALDO ALFREDO", "Área": "PRODUCCIÓN MONTAJE", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "ENTREGADO" },
  { "ID": "3932", "Nombre": "CASTAÑEDA HERNANDEZ ARELI", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "AGOSTO", "Estatus": "SIN ENTREGAR" },
  { "ID": "3939", "Nombre": "MORALES AMADOR JUAN MANUEL", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3942", "Nombre": "SANTANA ZEPEDA FRANCISCA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3945", "Nombre": "LOPEZ OLVERA JUAN DIEGO", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3949", "Nombre": "MORENO JUAREZ RAUL", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3951", "Nombre": "MELO LIRA JESSABEL", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3954", "Nombre": "VAZQUEZ ZAMUDIO VICTOR", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3956", "Nombre": "MORALES GARCIA AIDE", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3957", "Nombre": "SALVADOR URBINA LAURA NANCY", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3959", "Nombre": "LOPEZ YAÑEZ DIEGO", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3960", "Nombre": "GALVEZ LAZARO JUAN MANUEL", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3961", "Nombre": "RODRIGUEZ ACOSTA YULI", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3962", "Nombre": "RUIZ GARCIA NAZARIO", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3963", "Nombre": "RUIZ GABRIEL ERICK SIAMIR", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3964", "Nombre": "ORTIZ JIMENEZ MARISOL", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3965", "Nombre": "BAUTISTA RESENDIZ ALICIA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3966", "Nombre": "MENDOZA GOMEZ JONATHAN DE JESUS", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3968", "Nombre": "MARTINEZ HIGUERA MA. DE JESUS", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3974", "Nombre": "CARDENAS MARTINEZ ISMAEL", "Área": "MOLDES", "Departamento": "TALLER DE MOLDES", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3976", "Nombre": "JAIMES SANTANA CYNTHIA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3978", "Nombre": "RAMIREZ RAMIREZ SARAI GUADALUPE", "Área": "LOGISTICA", "Departamento": "LOGISTICA", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3983", "Nombre": "MARTINEZ HERNANDEZ CLAUDIA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3984", "Nombre": "LUCAS ESPINDOLA CRISTOBAL", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3989", "Nombre": "MEDINA HERNANDEZ MARIA DEL ROSARIO", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3991", "Nombre": "AGUILAR CASTELLANOS MARIA MAGDALENA", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3992", "Nombre": "RIVERA SANCHEZ MARIA DEL ROSARIO", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3993", "Nombre": "JAIMES GUTIERREZ KAREN ARISBETH", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3994", "Nombre": "ANAYA SANCHEZ LUZ DEL ROSARIO", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3997", "Nombre": "VILLA RAMIREZ IRIS", "Área": "A. CALIDAD 2DO. TURNO", "Departamento": "CALIDAD", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "3999", "Nombre": "LUNA VELAZQUEZ MA. ESTHER", "Área": "RECURSOS HUMANOS", "Departamento": "RECURSOS HUMANOS", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4000", "Nombre": "MARQUEZ MORENO ALONDRA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4001", "Nombre": "CRUZ VITE ALMA LUZ", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "SEPTIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4003", "Nombre": "BALTAZAR MIRANDA DAVID ALEXIS", "Área": "MANTENIMIENTO", "Departamento": "MANTENIMIENTO", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4004", "Nombre": "RAMIREZ PEREZ ADILENE", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4006", "Nombre": "MEDELLIN VELAZQUEZ LUZ MARIA", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4010", "Nombre": "HERNADEZ HERNADEZ ADAN ULISES", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4011", "Nombre": "RICO SUAREZ MA. SUSANA", "Área": "PRODUCCIÓN 1ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4014", "Nombre": "ESQUIVEL MATA ARIADNA NAYELY", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4015", "Nombre": "BAHENA MEJIA MONICA NAYELI", "Área": "PRODUCCIÓN 3ER. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4017", "Nombre": "CRUZ NAVARRETE DIANA ALHELI", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4018", "Nombre": "MARTINEZ JULIAN ANIRUBIT", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4019", "Nombre": "JIMENEZ OLALDE JUAN MANUEL", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4020", "Nombre": "HERNANDEZ HERNANDEZ JAVIER", "Área": "ALMACEN", "Departamento": "ALMACEN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4024", "Nombre": "SANTIAGO RESENDIZ CINTHIA VERONICA", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4025", "Nombre": "CARRILLO MADRIGAL HERMILO", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4026", "Nombre": "GONZALEZ CASTRO STEPHANIE", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4028", "Nombre": "MEDINA SOTO MARIA DOLORES", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4029", "Nombre": "GARCIA ESTRADA FATIMA PALOMA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4030", "Nombre": "MIRANDA VAZQUEZ CONCEPCION", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4031", "Nombre": "BRAVO JUAN ROSA MARINA", "Área": "PRODUCCIÓN 2o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "OCTUBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4032", "Nombre": "RICO MUÑOZ JORGE OSWALDO", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4035", "Nombre": "BOLAINA GOMEZ MARIA DEL CARMEN", "Área": "PRODUCCIÓN 4o. TURNO", "Departamento": "PRODUCCIÓN", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4036", "Nombre": "CASTILLO ARIAS GABRIELA", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4038", "Nombre": "RODRIGUEZ RODRIGUEZ TANIA YURITZI", "Área": "A. CALIDAD 1ER TURNO", "Departamento": "CALIDAD", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4039", "Nombre": "RODRIGUEZ VEGA OCIEL ALEJANDRO", "Área": "METROLOGÍA", "Departamento": "CALIDAD", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" },
  { "ID": "4040", "Nombre": "VAZQUEZ IRETA SOFIA GUADALUPE", "Área": "CALIDAD ADMTVO", "Departamento": "CALIDAD", "Mes Auditable": "NOVIEMBRE", "Estatus": "SIN ENTREGAR" }
];

// Función para normalizar
const normalizarTexto = (texto) => {
    if (!texto) return "";
    return texto.toString().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// --- 3. PROCESO DE SUBIDA ---
async function subirDatos() {
    console.log(`🚀 Iniciando subida de ${datosBrutos.length} registros...`);

    const batchSize = 400; 
    let batch = db.batch();
    let contador = 0;
    let totalSubidos = 0;

    for (const item of datosBrutos) {
        if (!item.ID) continue;

        // Limpieza y Mapeo
        const docData = {
            id_registro: item.ID.toString(),
            nombre_empleado: item.Nombre ? item.Nombre.trim() : "SIN NOMBRE",
            area: item["Área"] ? item["Área"].trim() : "SIN AREA",
            departamento: item.Departamento ? item.Departamento.trim() : "SIN DEPTO",
            mes_auditable: item["Mes Auditable"] ? item["Mes Auditable"].trim().toUpperCase() : "PENDIENTE",
            estatus: item.Estatus ? item.Estatus.trim().toUpperCase() : "DESCONOCIDO",
            fecha_carga: new Date(),
            keywords: [
                normalizarTexto(item.Nombre).toLowerCase(),
                item.ID.toString()
            ]
        };

        const docRef = db.collection(nombreColeccion).doc(docData.id_registro);
        batch.set(docRef, docData, { merge: true });

        contador++;

        if (contador >= batchSize) {
            await batch.commit();
            totalSubidos += contador;
            process.stdout.write("."); // Barra de progreso
            batch = db.batch();
            contador = 0;
        }
    }

    if (contador > 0) {
        await batch.commit();
        totalSubidos += contador;
    }

    console.log(`\n🎉 ¡EXITO! Se subieron ${totalSubidos} registros correctamente.`);
}

subirDatos();