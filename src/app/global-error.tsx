'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg text-center">
            <CardHeader>
              <div className="mx-auto w-fit rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
              </div>
              <CardTitle className="mt-4 text-2xl font-bold">
                Ocurrió un Error Inesperado
              </CardTitle>
              <CardDescription>
                Nuestro equipo ha sido notificado. Por favor, intenta recargar la página.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => reset()}>
                Volver a Intentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
