
'use client';

import { useEffect, useRef } from 'react';

interface UseIdleTimerProps {
  onIdle: () => void;
  timeout: number;
}

/**
 * Hook para detectar la inactividad del usuario.
 * @param onIdle - Función a ejecutar cuando el usuario está inactivo.
 * @param timeout - Tiempo en milisegundos para considerar al usuario inactivo.
 */
export const useIdleTimer = ({ onIdle, timeout }: UseIdleTimerProps) => {
  const timeoutId = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onIdle, timeout);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleEvent = () => {
      resetTimer();
    };

    // Configura el temporizador inicial
    resetTimer();

    // Agrega los listeners de eventos para detectar actividad
    events.forEach(event => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    // Función de limpieza para remover los listeners cuando el componente se desmonte
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [onIdle, timeout]); // Se vuelve a ejecutar si cambian las props

  return null; // Este hook no renderiza nada
};
