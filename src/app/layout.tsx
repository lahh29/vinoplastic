
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ui/theme-provider';
import { FirebaseClientProvider, useUser, useDoc, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { IdleTimeoutDialog } from '@/components/ui/idle-timeout-dialog';
import { Sidebar } from '@/components/ui/sidebar';

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
        if (!isUserLoading && !user) {
            if (pathname !== '/login' && pathname !== '/activar') {
                router.replace('/login');
            }
        } else if (currentUserData?.requiresPasswordChange && pathname !== '/cambiar-password') {
            router.replace('/cambiar-password');
        }
    }, [user, isUserLoading, router, currentUserData, pathname]);

    const isLoading = isUserLoading || isRoleLoading;
    const isAuthPage = ['/login', '/activar', '/cambiar-password', '/'].includes(pathname);
    
    if (isLoading && !isAuthPage) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Cargando sesión...</p>
                </div>
            </div>
        );
    }
    
    if (isAuthPage || !user || currentUserData?.requiresPasswordChange) {
        return <>{children}</>;
    }
    
    // Si el usuario es un empleado y no está en su portal, redirigirlo.
    if(currentUserData?.role === 'empleado' && pathname !== '/portal' && !pathname.startsWith('/portal/')) {
        router.replace('/portal');
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Redirigiendo a tu portal...</p>
                </div>
            </div>
        );
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
