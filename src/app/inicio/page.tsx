
'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { ClipboardList, BookCopy, AlertTriangle, FileDown, GitBranch, CalendarClock, User, BarChart, HardHat, Loader2, Target as TargetIcon, CalendarDays, Sparkles, HelpCircle, FileText } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import React, { useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';


// Interfaces
interface UserData {
    id: string; // Corresponds to UID
    email: string;
    nombre?: string;
    role: 'admin' | 'lector' | 'empleado';
}

const navLinks = [
    { href: "/inicio/plan-de-carrera", icon: GitBranch, title: "Plan de Carrera", description: "Visualiza la lógica y requisitos para los cambios de categoría en cada puesto.", tourId: "inicio-carrera" },
    { href: "/perfil", icon: User, title: "Perfil de Empleado", description: "Consulta el perfil detallado de un empleado.", tourId: "inicio-perfil" },
    { href: "/inicio/plan-capacitacion", icon: TargetIcon, title: "Plan Anual de Capacitación", description: "Diseña y gestiona el plan estratégico de capacitación basado en datos.", tourId: "inicio-plan-capacitacion" },
    { href: "/programa", icon: CalendarDays, title: "Programa", description: "Visualiza los cursos asignados a cada puesto para la planeación mensual.", tourId: "inicio-programa" },
    { href: "/diagnostico/banco-de-preguntas", icon: HelpCircle, title: "Banco de Preguntas", description: "Consulta y busca en el catálogo completo de preguntas para exámenes.", tourId: "inicio-banco-preguntas" }
];


export default function InicioPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const currentUserInfoRef = useMemoFirebase(
      () => (user ? doc(firestore, 'usuarios', user.uid) : null),
      [user, firestore]
    );
    const { data: currentUserData, isLoading: isRoleLoading } = useDoc<UserData>(currentUserInfoRef);
    
    useEffect(() => {
        if (!isUserLoading && !isRoleLoading && currentUserData) {
            if (currentUserData.role === 'empleado') {
                router.replace('/portal');
            }
        }
    }, [isUserLoading, isRoleLoading, currentUserData, router]);

    const userName = useMemo(() => {
        return currentUserData?.nombre || user?.displayName || 'Usuario';
    }, [currentUserData, user]);

    if (isUserLoading || isRoleLoading || !currentUserData || currentUserData.role === 'empleado') {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-muted-foreground">Cargando portal...</p>
                </div>
            </div>
        );
    }


  return (
    <div className="h-full w-full">
      <div className="space-y-4 mb-8" data-tour="inicio-header">
        <h1 className="text-4xl font-bold tracking-tight">
            Bienvenido, {userName}
        </h1>
        <p className="text-lg text-muted-foreground max-w-4xl">
          Herramientas y diagnósticos para la gestión de talento y capacitación.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {navLinks.map((item) => (
             <Link key={item.href} href={item.href} className="block hover:no-underline group" data-tour={item.tourId}>
                <motion.div
                    whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-full"
                >
                    <Card className="h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/60 border-border/50 hover:border-primary/50 backdrop-blur-sm">
                        <motion.div
                            whileHover={{ rotateY: 180, transition: { duration: 0.5 } }}
                             animate={{
                                color: [
                                'hsl(217, 91%, 60%)', // Azul
                                'hsl(260, 85%, 65%)', // Púrpura intermedio
                                'hsl(0, 84%, 60%)',   // Rojo
                                'hsl(260, 85%, 65%)', // Púrpura intermedio
                                'hsl(217, 91%, 60%)'  // Vuelta al Azul
                                ],
                            }}
                            transition={{
                                duration: 4,
                                ease: "easeInOut",
                                repeat: Infinity,
                                repeatType: "loop",
                            }}
                            className="text-primary mb-4"
                            style={{ perspective: 800 }}
                        >
                            <item.icon className="h-12 w-12" />
                        </motion.div>
                        <CardTitle className="text-xl font-semibold">
                            {item.title}
                        </CardTitle>
                    </Card>
                </motion.div>
            </Link>
        ))}
       </div>
    </div>
  );
}
