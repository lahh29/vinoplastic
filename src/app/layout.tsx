
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ui/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import MainUILayoutWrapper from '@/components/ui/main-ui-layout';
import { usePathname } from 'next/navigation';

// Metadata estática. No se puede usar hooks aquí.
// export const metadata: Metadata = {
//   title: 'Recursos Humanos',
//   description: 'Panel de recursos humanos intuitivo y moderno.',
// };

function RootContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/activar', '/cambiar-password'].includes(pathname) || pathname === '/';
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  return <MainUILayoutWrapper>{children}</MainUILayoutWrapper>;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>Recursos Humanos</title>
        <meta name="description" content="Panel de recursos humanos intuitivo y moderno." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
        >
            <FirebaseClientProvider>
                <RootContent>{children}</RootContent>
            </FirebaseClientProvider>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
