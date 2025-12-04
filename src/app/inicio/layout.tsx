
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
  FileDown,
  GraduationCap,
  Bell,
  FileClock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth, useUser, useCollection, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
import { motion, AnimatePresence } from 'framer-motion';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

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
  const { data: contratos } = useCollection<Contrato>(contratosRef);
  const [isOpen, setIsOpen] = React.useState(false);
  
  const [notifications, setNotifications] = React.useState<{ expiringContracts: any[], dueEvaluations: any[] }>({ expiringContracts: [], dueEvaluations: [] });
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!contratos || !isClient) return;

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

    setNotifications({
      expiringContracts: expiring.sort((a,b) => (getDate(a.fechas_contrato.termino)?.getTime() ?? 0) - (getDate(b.fechas_contrato.termino)?.getTime() ?? 0)),
      dueEvaluations: evaluationsDue.sort((a,b) => (getDate(a.contrato.evaluaciones.primera.fecha_programada)?.getTime() ?? 0) - (getDate(b.contrato.evaluaciones.primera.fecha_programada)?.getTime() ?? 0))
    });
  }, [contratos, isClient]);

  const notificationCount = notifications.expiringContracts.length + notifications.dueEvaluations.length;
  
  const contentVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15, ease: 'easeIn' } },
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {isClient && notificationCount > 0 && (
            <span className="absolute top-2 right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <AnimatePresence>
        {isOpen && (
            <DropdownMenuContent
                asChild
                forceMount
                align="end"
                className="w-80 shadow-2xl border-border/50 rounded-2xl p-0"
              >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={contentVariants}
              >
                  <div className='p-4 border-b border-border/50'>
                    <h3 className="font-semibold">Notificaciones</h3>
                  </div>
                  <div className="py-2 px-2 max-h-96 overflow-y-auto space-y-2">
                    <div className="px-2 py-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-destructive"/> Contratos por Vencer
                      </h4>
                      {notifications.expiringContracts.length > 0 ? (
                        notifications.expiringContracts.map(c => (
                          <div key={c.id} className="p-2.5 rounded-lg hover:bg-accent/50">
                            <p className="font-medium text-sm">{c.nombre_completo}</p>
                            <p className="text-xs text-destructive">Vence: {formatDate(c.fechas_contrato.termino)}</p>
                          </div>
                        ))
                      ) : <p className="p-2 text-sm text-muted-foreground italic">Nada por aquí.</p>}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2 mb-2">
                        <FileClock className="h-4 w-4 text-primary"/> Evaluaciones Próximas
                      </h4>
                      {notifications.dueEvaluations.length > 0 ? (
                        notifications.dueEvaluations.map((item: any) => (
                          <div key={item.contrato.id + item.tipo} className="p-2.5 rounded-lg hover:bg-accent/50">
                            <p className="font-medium text-sm">{item.contrato.nombre_completo}</p>
                            <p className="text-xs text-primary">
                              {item.tipo} evaluación antes del: {item.fecha}
                            </p>
                          </div>
                        ))
                      ) : <p className="p-2 text-sm text-muted-foreground italic">Todo al día.</p>}
                    </div>
                  </div>
                {notificationCount === 0 && <p className="p-8 text-center text-sm text-muted-foreground">¡Sin notificaciones pendientes!</p>}
              </motion.div>
            </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  )
}

export default function InicioLayout({
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
  
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent">
        <StarsBackground starColor='#fff' speed={0.5} className="absolute inset-0 z-[-1]"/>
        
        <main className="flex-1 overflow-auto pb-24">
            <div className="h-full p-4 sm:p-6 lg:p-8">
                {children}
            </div>
        </main>
        <div className="fixed inset-x-0 bottom-6 z-50">
            <TooltipProvider>
                <Dock direction="middle" className="bg-background/70 border-border/60 backdrop-blur-sm">
                    {navItems.map((item) => (
                        <Tooltip key={item.label}>
                            <TooltipTrigger asChild>
                                <Link href={item.href}>
                                    <DockIcon className={pathname.startsWith(item.href) ? 'bg-primary/10 text-primary' : ''}>
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
                           <div>
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
        </div>
    </div>
  );
}
