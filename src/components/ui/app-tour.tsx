
'use client';

import React, { useState, useEffect } from 'react';
import Joyride, { Step } from 'react-joyride';
import { tourSteps } from '@/lib/tour-steps';

export const AppTour = () => {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Check if the tour has been completed before
    const tourCompleted = localStorage.getItem('vinoplastic_tour_completed');
    if (!tourCompleted) {
      setRunTour(true);
      localStorage.setItem('vinoplastic_tour_completed', 'true');
    }
  }, []);

  return (
    <Joyride
      steps={tourSteps}
      run={runTour}
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
