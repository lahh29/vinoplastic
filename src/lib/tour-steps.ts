
import { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="dock-menu"]',
    content: 'Este es el menú principal. Desde aquí puedes navegar a todas las secciones de la plataforma.',
    title: 'Navegación Principal',
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Aquí encontrarás alertas importantes, como contratos a punto de vencer o evaluaciones próximas.',
    title: 'Centro de Notificaciones',
    placement: 'top',
  },
  {
    target: '[data-tour="profile-menu"]',
    content: 'Desde aquí puedes acceder a la gestión de usuarios y cerrar tu sesión.',
    title: 'Tu Perfil',
    placement: 'top',
  },
];
