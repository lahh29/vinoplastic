
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Home,
  Users,
  BookUser,
  LogOut,
  Shapes,
  User,
  Settings,
  GraduationCap,
  Bell,
  FileClock,
  AlertTriangle,
  CalendarClock
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, Timestamp } from 'firebase/firestore';
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
import { format, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatedUserIcon } from '@/components/ui/animated-user-icon';
import { motion } from 'framer-motion';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';


const navItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/contratos', icon: FileText, label: 'Contratos' },
  { href: '/empleados', icon: Users, label: 'Empleados' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
  { href: '/categorias', icon: Shapes, label: 'Categorías' },
  { href: '/formacion', icon: GraduationCap, label: 'Formación' },
];

// Interfaces para notificaciones
interface Contrato {
  id: string;
  nombre_completo: string;
  indeterminado?: boolean;
  fechas_contrato: {
    termino: Timestamp;
  };
  evaluaciones?: {
    primera: { fecha_programada: Timestamp; estatus: string };
    segunda: { fecha_programada: Timestamp; estatus: string };
    tercera: { fecha_programada: Timestamp; estatus: string };
  };
}

interface UserData {
    id: string;
    email: string;
    nombre?: string;
    role: 'admin' | 'lector';
}

const getDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    const date = new Date(timestamp);
    return isValid(date) ? date : null;
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  const date = getDate(timestamp);
  if (!date || !isValid(date)) return 'Fecha inválida';
  return format(date, 'dd/MMM/yy', { locale: es });
};

// Componente de notificaciones
function Notifications() {
  const firestore = useFirestore();
  const contratosRef = useMemoFirebase(() => firestore ? collection(firestore, 'Contratos') : null, [firestore]);
  const { data: contratos, isLoading } = useCollection<Contrato>(contratosRef);
  
  const notifications = React.useMemo(() => {
    if (!contratos || isLoading) {
      return { expiringContracts: [], dueEvaluations: [] };
    }

    const today = new Date();
    const fifteenDaysFromNow = addDays(today, 15);
    const sevenDaysFromNow = addDays(today, 7);

    const expiring = contratos.filter(c => {
        if (c.indeterminado) return false;
        const termDate = getDate(c.fechas_contrato?.termino);
        return termDate && termDate >= today && termDate <= fifteenDaysFromNow;
    });
    
    const evaluationsDue: {contrato: Contrato, fecha: string, tipo: string}[] = [];
    contratos.forEach(c => {
        if (!c.evaluaciones) return;
        const eval1Date = getDate(c.evaluaciones.primera?.fecha_programada);
        const eval2Date = getDate(c.evaluaciones.segunda?.fecha_programada);
        const eval3Date = getDate(c.evaluaciones.tercera?.fecha_programada);

        if (eval1Date && eval1Date >= today && eval1Date <= sevenDaysFromNow && c.evaluaciones.primera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.primera.fecha_programada), tipo: 'Primera' });
        }
        if (eval2Date && eval2Date >= today && eval2Date <= sevenDaysFromNow && c.evaluaciones.segunda.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.segunda.fecha_programada), tipo: 'Segunda' });
        }
        if (eval3Date && eval3Date >= today && eval3Date <= sevenDaysFromNow && c.evaluaciones.tercera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.tercera.fecha_programada), tipo: 'Tercera' });
        }
    });

    return {
      expiringContracts: expiring.sort((a,b) => (getDate(a.fechas_contrato.termino)?.getTime() ?? 0) - (getDate(b.fechas_contrato.termino)?.getTime() ?? 0)),
      dueEvaluations: evaluationsDue.sort((a,b) => (getDate(a.contrato.evaluaciones.primera.fecha_programada)?.getTime() ?? 0) - (getDate(b.contrato.evaluaciones.primera.fecha_programada)?.getTime() ?? 0))
    };
  }, [contratos, isLoading]);

  const notificationCount = notifications.expiringContracts.length + notifications.dueEvaluations.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <DockIcon>
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </DockIcon>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Notificaciones</DialogTitle>
          <DialogDescription>
            Alertas importantes sobre contratos y evaluaciones del personal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive"/> Contratos por Vencer
            </h4>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                  {notifications.expiringContracts.length > 0 ? (
                  notifications.expiringContracts.map(c => (
                      <div key={c.id} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="font-semibold text-sm">{c.nombre_completo}</p>
                      <p className="text-xs text-destructive">Vence: {formatDate(c.fechas_contrato.termino)}</p>
                      </div>
                  ))
                  ) : <div className="flex h-full items-center justify-center"><p className="p-2 text-sm text-muted-foreground italic">Nada por aquí.</p></div>}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FileClock className="h-4 w-4 text-primary"/> Evaluaciones Próximas
            </h4>
            <ScrollArea className="h-64 pr-4">
                <div className="space-y-3">
                    {notifications.dueEvaluations.length > 0 ? (
                    notifications.dueEvaluations.map((item: any) => (
                        <div key={item.contrato.id + item.tipo} className="p-3 bg-secondary/50 rounded-lg">
                        <p className="font-semibold text-sm">{item.contrato.nombre_completo}</p>
                        <p className="text-xs text-primary">
                            {item.tipo} evaluación antes del: {item.fecha}
                        </p>
                        </div>
                    ))
                    ) : <div className="flex h-full items-center justify-center"><p className="p-2 text-sm text-muted-foreground italic">Todo al día.</p></div>}
                </div>
            </ScrollArea>
          </div>
        </div>
      {notificationCount === 0 && <p className="py-8 text-center text-sm text-muted-foreground">¡Sin notificaciones pendientes!</p>}
      </DialogContent>
    </Dialog>
  )
}

export default function MainUILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  
  const currentUserInfoRef = useMemoFirebase(
      () => (user ? doc(firestore, 'usuarios', user.uid) : null),
      [user, firestore]
  );
  const { data: currentUserData } = useDoc<UserData>(currentUserInfoRef);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }
  
  const isActive = (href: string) => {
    if (href === '/inicio') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent">
        <StarsBackground starColor='#fff' speed={0.5} className="absolute inset-0 z-[-1]"/>
        
        <main className="flex-1 overflow-auto pb-24">
            <div className="h-full p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </main>
        <motion.div 
            className="fixed inset-x-0 bottom-6 z-50"
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
                                    <DockIcon className={isActive(item.href) ? 'bg-primary/10 text-primary' : ''}>
                                        <item.icon className="h-6 w-6" />
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
                          <div className="h-full flex items-center">
                              <Notifications />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Notificaciones</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <DockIcon>
                                      <AnimatedUserIcon />
                                  </DockIcon>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                                  <DropdownMenuLabel className="font-normal">
                                      <div className="flex flex-col space-y-1">
                                          <p className="text-sm font-medium leading-none">{currentUserData?.nombre || user.displayName || 'Usuario'}</p>
                                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                      </div>
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href="/usuarios">
                                      <Users className="mr-2 h-4 w-4" />
                                      <span>Usuarios</span>
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                      <Settings className="mr-2 h-4 w-4" />
                                      <span>Configuración</span>
                                  </DropdownMenuItem>
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
    </div>
  );
}
