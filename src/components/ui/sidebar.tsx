
'use client';

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Users,
  BookUser,
  LogOut,
  User,
  Settings,
  FileText,
  CalendarClock,
  BarChart,
  GitBranch,
  Briefcase
} from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore';
import { useRoleCheck } from "@/hooks/use-role-check";
import { cn } from "@/lib/utils"
import { Notifications } from "./notifications";
import { ThemeToggle } from "./theme-toggle";

interface UserData {
    nombre?: string;
    email?: string;
}

const adminNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/empleados', icon: Users, label: 'Empleados' },
  { href: '/contratos', icon: FileText, label: 'Contratos' },
  { href: '/vacaciones', icon: CalendarClock, label: 'Vacaciones' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
  { href: '/categorias', icon: GitBranch, label: 'Promociones' },
  { href: '/reportes', icon: BarChart, label: 'Reportes' },
];

const lectorNavItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/empleados', icon: Users, label: 'Empleados' },
  { href: '/contratos', icon: FileText, label: 'Contratos' },
  { href: '/vacaciones', icon: CalendarClock, label: 'Vacaciones' },
  { href: '/capacitacion', icon: BookUser, label: 'Capacitación' },
];

const employeeNavItems = [
    { href: '/portal', icon: User, label: 'Mi Portal' },
];


export function Sidebar() {
  const pathname = usePathname()
  const auth = useAuth()
  const { user } = useUser()
  const firestore = useFirestore();
  const { isAdmin, isLector } = useRoleCheck();
  
  const currentUserInfoRef = useMemoFirebase(
    () => (user ? doc(firestore, 'usuarios', user.uid) : null),
    [user, firestore]
  );
  const { data: currentUserData } = useDoc<UserData>(currentUserInfoRef);

  const navItems = isAdmin ? adminNavItems : isLector ? lectorNavItems : employeeNavItems;

  const handleLogout = () => {
    if (auth) {
      auth.signOut();
    }
  };
  
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-20 flex-col border-r bg-background/50 backdrop-blur-lg sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link href="/inicio" className="group flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full text-lg font-semibold text-primary-foreground md:h-10 md:w-10 md:text-base mb-4">
             <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">VP</div>
            <span className="sr-only">ViñoPlastic</span>
        </Link>
        <TooltipProvider>
            {navItems.map((item) => (
                <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                    <Link href={item.href} className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-9 md:w-9",
                        (pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href))) && "bg-primary/10 text-primary"
                    )}>
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                    </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
            ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
         <Notifications />
         <ThemeToggle />
        <DropdownMenu>
            <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                    <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full h-10 w-10"
                    >
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${user?.email}`} alt="Avatar" />
                        <AvatarFallback>{currentUserData?.nombre?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Perfil y Opciones</TooltipContent>
            </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end" side="right">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{currentUserData?.nombre || user?.displayName || 'Usuario'}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/perfil"><User className="mr-2 h-4 w-4"/>Perfil</Link>
                </DropdownMenuItem>
                 {isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link href="/usuarios"><Settings className="mr-2 h-4 w-4"/>Usuarios</Link>
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </aside>
  )
}
