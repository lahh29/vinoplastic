
import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  // --- INICIO ---
  {
    target: 'body',
    content: '¡Bienvenido a GestionaFácil HR! Este rápido recorrido te mostrará las funciones principales de la plataforma.',
    title: 'Bienvenida',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dock-menu"]',
    content: 'Este es tu centro de navegación. Desde aquí puedes acceder a todos los módulos de la aplicación con un solo clic.',
    title: 'Menú Principal',
    placement: 'top',
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Aquí encontrarás alertas importantes, como contratos por vencer o evaluaciones próximas. ¡Mantenlo vigilado!',
    title: 'Centro de Notificaciones',
    placement: 'top',
  },
  {
    target: '[data-tour="profile-menu"]',
    content: 'Accede a la gestión de usuarios (si eres administrador) o cierra tu sesión de forma segura desde aquí.',
    title: 'Tu Perfil y Sesión',
    placement: 'top',
  },
  {
    target: '[data-tour="inicio-header"]',
    content: 'Esta es la página de inicio, tu punto de partida para acceder a las diferentes herramientas de gestión.',
    title: 'Página de Inicio',
    placement: 'bottom',
  },
  // --- CAPACITACIÓN ---
  {
    target: '[href="/capacitacion"]',
    content: 'Vamos a explorar el módulo de Capacitación. Haz clic aquí para continuar.',
    title: 'Módulo de Capacitación',
    placement: 'top',
  },
  {
    target: '[data-tour="capacitacion-matriz"]',
    content: 'Define qué cursos son obligatorios para cada puesto. Esta es la base para medir el cumplimiento.',
    title: 'Matriz de Habilidades',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="capacitacion-captura"]',
    content: 'Aquí puedes registrar los cursos que los empleados han completado, junto con sus calificaciones y fechas.',
    title: 'Captura de Cursos',
    placement: 'bottom',
  },
  {
    target: '[data-tour="capacitacion-analisis"]',
    content: 'Obtén una vista general del progreso de capacitación de toda la empresa con métricas y gráficos clave.',
    title: 'Análisis General',
    placement: 'bottom',
  },
  // --- EMPLEADOS Y CONTRATOS ---
  {
    target: '[href="/empleados"]',
    content: 'Ahora, veamos cómo gestionar al personal. Haz clic aquí.',
    title: 'Módulo de Empleados',
    placement: 'top',
  },
  {
    target: '[data-tour="empleados-crear"]',
    content: 'Desde este botón puedes añadir nuevos empleados a la plataforma. Al hacerlo, se creará automáticamente su expediente y contrato inicial.',
    title: 'Crear Nuevo Empleado',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="empleados-tabla"]',
    content: 'Esta tabla muestra toda tu plantilla. Puedes buscar, filtrar y hacer clic en un empleado para editar sus datos.',
    title: 'Listado de Personal',
    placement: 'top',
  },
  {
    target: '[href="/contratos"]',
    content: 'Este módulo es crucial para el seguimiento. Haz clic para ver la gestión de contratos.',
    title: 'Módulo de Contratos',
    placement: 'top',
  },
  {
    target: '[data-tour="contratos-vencer"]',
    content: 'Esta tarjeta te alerta sobre los contratos que están a punto de terminar, dándote tiempo para tomar decisiones.',
    title: 'Contratos por Vencer',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="contratos-evaluaciones"]',
    content: 'Aquí verás las evaluaciones de desempeño que deben realizarse próximamente.',
    title: 'Evaluaciones Próximas',
    placement: 'bottom',
  },
  {
    target: '[data-tour="contratos-tabla"]',
    content: 'Al igual que en Empleados, puedes hacer clic en una fila para actualizar las calificaciones de las evaluaciones de un contrato o marcarlo como indeterminado.',
    title: 'Gestión de Contratos',
    placement: 'top',
  },
  // --- Final ---
  {
    target: 'body',
    content: '¡Eso es todo! Has completado el recorrido por las funciones principales. Explora la plataforma y no dudes en experimentar.',
    title: '¡Tour Finalizado!',
    placement: 'center',
  },
];
