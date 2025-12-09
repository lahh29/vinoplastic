'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirige inmediatamente a la página de login
    router.replace('/login');
  }, [router]);

  // Muestra un loader mientras se realiza la redirección
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redireccionando al portal...</p>
        </div>
    </div>
  );
}
