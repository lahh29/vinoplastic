'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ui/theme-provider';
import { FirebaseClientProvider, useUser, useDoc, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Home, Users, BookUser, LogOut, User, Sun, Moon } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useRoleCheck } from '@/hooks/use-role-check';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { IdleTimeoutDialog } from '@/components/ui/idle-timeout-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Notifications } from '@/components/ui/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface UserData {
    id: string;
    email: string;
    nombre?: string;
    role: 'admin' | 'lector' | 'empleado';
    requiresPasswordChange?: boolean;
}

const adminNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
  { href: '/empleados', icon: Users, label: 'Empleados' },
];

const lectorNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
];

const employeeNavItems = [
  { href: '/portal', icon: Home, label: 'Mi Portal' },
];


function RootContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { isAdmin } = useRoleCheck();
    const auth = useAuth();
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

    const handleLogout = () => {
        if (auth) {
          auth.signOut();
        }
    };

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
    
    if (isAuthPage || !user) {
        return <>{children}</>;
    }

    if (currentUserData?.requiresPasswordChange) {
        return <>{children}</>;
    }
    
    const userRole = currentUserData?.role;
    const navItems = userRole === 'admin' ? adminNavItems : userRole === 'lector' ? lectorNavItems : employeeNavItems;

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background">
            <StarsBackground speed={0.2} className="absolute inset-0 z-0"/>
            <IdleTimeoutDialog />
            
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background/80 backdrop-blur-sm sm:flex">
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                    <Link href="/inicio" className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base">
                        <Logo className="h-4 w-4 transition-all group-hover:scale-110" />
                        <span className="sr-only">Viñoplastic</span>
                    </Link>
                    <TooltipProvider>
                        {navItems.map((item) => (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex h-9 w-full items-center justify-start rounded-lg px-3 transition-colors md:h-8",
                                            (pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href)))
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5 mr-4" />
                                        <span className="text-sm font-medium">{item.label}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{item.label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                </nav>
            </aside>

            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
                 <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                    <div className="relative ml-auto flex flex-1 md:grow-0"></div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                            variant="outline"
                            size="icon"
                            className="overflow-hidden rounded-full"
                            >
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user?.email}`} alt="@shadcn" />
                                <AvatarFallback>{currentUserData?.nombre?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{currentUserData?.nombre || user.displayName || 'Usuario'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(isAdmin) && (<Notifications />)}
                            {isAdmin && (
                                <DropdownMenuItem asChild>
                                    <Link href="/usuarios">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>Usuarios</span>
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </header>
                <main className="relative z-10 flex-1 overflow-auto p-4 pt-0 sm:p-6 sm:pt-0">
                    {children}
                </main>
            </div>
        </div>
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
