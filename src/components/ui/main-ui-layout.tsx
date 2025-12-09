
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, BookUser, LogOut, User, Sun, Moon } from 'lucide-react';
import { useAuth, useUser, useDoc, FirebaseClientProvider } from '@/firebase';
import { Dock, DockIcon } from '@/components/ui/dock';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedUserIcon } from '@/components/ui/animated-user-icon';
import { motion } from 'framer-motion';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { IdleTimeoutDialog } from './idle-timeout-dialog';
import { useTheme } from "next-themes";
import { AnimatedDockIcon } from './animated-dock-icon';
import { useMemoFirebase } from '@/hooks/use-memo-firebase';
import { useRoleCheck } from '@/hooks/use-role-check';
import { useIsMobile } from '@/hooks/use-mobile';
import { doc } from 'firebase/firestore';
import { Notifications } from '@/components/ui/notifications';
import { Auth } from 'firebase/auth';


const adminNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
];

const lectorNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
];

const employeeNavItems = [
  { href: '/portal', icon: Home, label: 'Mi Portal' },
];

interface UserData {
    id: string;
    email: string;
    nombre?: string;
    role: 'admin' | 'lector' | 'empleado';
    requiresPasswordChange?: boolean;
}

const isActive = (href: string, pathname: string) => {
    if (href === '/inicio' || href === '/portal') {
        return pathname === href;
    }
    return pathname.startsWith(href);
}

function MobileNav({ navItems, pathname, handleLogout, currentUserData, user, isAdmin }: any) {
  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/70 backdrop-blur-sm border-t border-border/60">
      <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
        {navItems.map((item: any) => (
          <Link key={item.label} href={item.href} className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group">
            <item.icon className={`w-6 h-6 mb-1 ${isActive(item.href, pathname) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
            <span className={`text-xs ${isActive(item.href, pathname) ? 'text-primary' : 'text-muted-foreground'}`}>{item.label}</span>
          </Link>
        ))}
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="inline-flex flex-col items-center justify-center px-5 hover:bg-muted/50 group">
                    <User className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-foreground" />
                    <span className="text-xs text-muted-foreground">Perfil</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{currentUserData?.nombre || user.displayName || 'Usuario'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(isAdmin) && (<Notifications />)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-500/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function MainUILayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const { isAdmin } = useRoleCheck();
  const { setTheme, theme } = useTheme();
  const isMobile = useIsMobile();
  const firestore = useFirestore();
  
  const currentUserInfoRef = useMemoFirebase(
      () => (user ? doc(firestore, 'usuarios', user.uid) : null),
      [user, firestore]
  );
  const { data: currentUserData, isLoading: isRoleLoading } = useDoc<UserData>(currentUserInfoRef);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
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

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }
  
  const userRole = currentUserData?.role;
  const navItems = userRole === 'admin' ? adminNavItems : userRole === 'lector' ? lectorNavItems : employeeNavItems;
  
  if (currentUserData?.requiresPasswordChange) {
      return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background overflow-hidden">
        <StarsBackground speed={0.5} className="absolute inset-0 z-0"/>
        <IdleTimeoutDialog />
        <main className="relative z-10 flex-1 overflow-auto pb-24">
            <div className="h-full p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </main>
        
        {isMobile ? (
            <MobileNav navItems={navItems} pathname={pathname} handleLogout={handleLogout} currentUserData={currentUserData} user={user} isAdmin={isAdmin}/>
        ) : (
            <motion.div 
                className="fixed inset-x-0 bottom-4 z-50 sm:bottom-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            >
                <TooltipProvider>
                    <Dock 
                        direction="middle" 
                        className="bg-background/70 border-border/60 backdrop-blur-sm"
                    >
                        {navItems.map((item) => (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <Link href={item.href}>
                                        <DockIcon className={isActive(item.href, pathname) ? 'bg-primary/10' : ''}>
                                            <AnimatedDockIcon>
                                            <item.icon className="h-6 w-6" />
                                            </AnimatedDockIcon>
                                        </DockIcon>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}

                        <div className="border-l h-full mx-2 border-border/60" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div>
                                    <DockIcon>
                                        <AnimatedUserIcon />
                                    </DockIcon>
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{currentUserData?.nombre || user.displayName || 'Usuario'}</p>
                                            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {(isAdmin) && (<Notifications />)}
                                    
                                    <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                                            {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                                            <span>Cambiar Tema</span>
                                        </DropdownMenuItem>
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
                                        <span>Cerrar sesión</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Perfil y Sesión</p>
                            </TooltipContent>
                        </Tooltip>
                    </Dock>
                </TooltipProvider>
            </motion.div>
        )}
    </div>
  );
}

export default function MainUILayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <MainUILayoutContent>{children}</MainUILayoutContent>
        </FirebaseClientProvider>
    )
}
