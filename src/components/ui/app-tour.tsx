
'use client';

import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps } from 'react-joyride';
import { tourSteps } from '@/lib/tour-steps';

export const AppTour = () => {
  const [runTour, setRunTour] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Solo se ejecuta en el cliente
    const tourCompleted = localStorage.getItem('vinoplastic_tour_completed');
    if (!tourCompleted) {
      // Pequeño retraso para asegurar que la UI esté montada
      setTimeout(() => {
          setRunTour(true);
      }, 500);
    }
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      // Solo marcar como completado cuando el tour realmente termina o se salta
      localStorage.setItem('vinoplastic_tour_completed', 'true');
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <Joyride
      steps={tourSteps}
      run={runTour}
      callback={handleJoyrideCallback}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--background))',
          backgroundColor: 'hsl(var(--background))',
        },
        buttonClose: {
            display: 'none',
        },
        tooltip: {
            borderRadius: 'var(--radius)',
        },
      }}
      locale={{
        back: 'Atrás',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
    />
  );
};
