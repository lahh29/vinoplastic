
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ui/theme-provider';
import { FirebaseClientProvider, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { IdleTimeoutDialog } from '@/components/ui/idle-timeout-dialog';
import { Sidebar } from '@/components/ui/sidebar';
import { Notifications } from '@/components/ui/notifications';

interface UserData {
    id: string;
    email: string;
    nombre?: string;
    role: 'admin' | 'lector' | 'empleado';
    requiresPasswordChange?: boolean;
}

function MainUILayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-screen w-full">
            <StarsBackground speed={0.2} className="absolute inset-0 z-0"/>
            <IdleTimeoutDialog />
            <Sidebar />
            <main className="relative z-10 flex-1 overflow-auto p-4 sm:p-6 lg:p-8 sm:ml-20">
                {children}
            </main>
        </div>
    );
}

function RootContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const currentUserInfoRef = useMemoFirebase(
        () => (user ? doc(firestore, 'usuarios', user.uid) : null),
        [user, firestore]
    );
    const { data: currentUserData, isLoading: isRoleLoading } = useDoc<UserData>(currentUserInfoRef);
    
    useEffect(() => {
        // No está cargando y no hay usuario
        if (!isUserLoading && !user) {
            if (pathname !== '/login' && pathname !== '/activar') {
                router.replace('/login');
            }
        }
        // Hay usuario y datos del usuario
        else if (user && currentUserData) {
            if (currentUserData.requiresPasswordChange && pathname !== '/cambiar-password') {
                router.replace('/cambiar-password');
            } else if (!currentUserData.requiresPasswordChange) {
                if (currentUserData.role === 'empleado' && !pathname.startsWith('/portal')) {
                     router.replace('/portal');
                } else if ((currentUserData.role === 'admin' || currentUserData.role === 'lector') && (pathname.startsWith('/portal') || pathname === '/login')) {
                     router.replace('/inicio');
                }
            }
        }
    }, [user, isUserLoading, router, currentUserData, pathname]);

    const isLoading = isUserLoading || (user && isRoleLoading);
    const isPublicPage = ['/login', '/activar'].includes(pathname);
    const isChangePasswordPage = pathname === '/cambiar-password';

    // Siempre muestra las páginas públicas
    if (isPublicPage) return <>{children}</>;
    // Muestra la página de cambio de contraseña si es necesaria
    if (isChangePasswordPage && currentUserData?.requiresPasswordChange) return <>{children}</>;

    // Muestra un loader en páginas protegidas mientras se verifica el estado
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Cargando sesión...</p>
                </div>
            </div>
        );
    }
    
    // Si después de cargar no hay usuario, no renderices el contenido protegido para evitar flashes
    if (!user) {
        return null; // O un loader más genérico si se prefiere
    }
    
    return (
        <MainUILayoutWrapper>
            {children}
        </MainUILayoutWrapper>
    );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>ViñoPlastic RH</title>
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
