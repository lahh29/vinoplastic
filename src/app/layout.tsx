
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ui/theme-provider';
import { FirebaseClientProvider, useUser, useDoc, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Home, Users, BookUser, LogOut, User } from 'lucide-react';
import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { useRoleCheck } from '@/hooks/use-role-check';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { IdleTimeoutDialog } from '@/components/ui/idle-timeout-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, Variants } from 'framer-motion';
import { AnimatedDockIcon } from '@/components/ui/animated-dock-icon';
import { Notifications } from '@/components/ui/notifications';
import { Dock, DockIcon } from '@/components/ui/dock';


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

function Header({ currentUserData, user, isAdmin }: { currentUserData: UserData, user: any, isAdmin: boolean }) {
    const auth = useAuth();
    const handleLogout = () => {
        if (auth) {
          auth.signOut();
        }
    };
    
    return (
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
                    <Notifications />
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
    );
}

function MainUILayoutWrapper({ children, navItems }: { children: React.ReactNode, navItems: any[] }) {
    const pathname = usePathname();
    const { user } = useUser();
    const firestore = useFirestore();
    const currentUserInfoRef = useMemoFirebase(
      () => (user ? doc(firestore, 'usuarios', user.uid) : null),
      [user, firestore]
    );
    const { data: currentUserData } = useDoc<UserData>(currentUserInfoRef);

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background">
            <StarsBackground speed={0.2} className="absolute inset-0 z-0"/>
            <IdleTimeoutDialog />
            <Header currentUserData={currentUserData!} user={user} isAdmin={currentUserData?.role === 'admin'}/>
            <main className="relative z-10 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
            <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                 <Dock>
                    {navItems.map((item) => (
                        <DockIcon key={item.label}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link href={item.href} className={cn(
                                            "flex items-center justify-center rounded-full text-lg transition-colors size-12",
                                            (pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href)))
                                            ? "bg-primary/20 text-primary"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}>
                                            <item.icon className="h-6 w-6" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{item.label}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </DockIcon>
                    ))}
                </Dock>
            </footer>
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
    
    const userRole = currentUserData?.role;
    const navItems = userRole === 'admin' ? adminNavItems : userRole === 'lector' ? lectorNavItems : employeeNavItems;

    return (
        <MainUILayoutWrapper navItems={navItems}>
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

