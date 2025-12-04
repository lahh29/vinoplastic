
'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { ClipboardList, BookCopy, AlertTriangle, FileDown, GitBranch, CalendarClock, User, BarChart, HardHat } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import React, { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { motion } from 'framer-motion';


// Interfaces
interface UserData {
    id: string; // Corresponds to UID
    email: string;
    nombre?: string;
    role: 'admin' | 'lector';
}

const navLinks = [
    { href: "/vacaciones", icon: CalendarClock, title: "Gestión de Vacaciones", description: "Visualiza el calendario de ausencias y programa las vacaciones del personal." },
    { href: "/capacitacion", icon: HardHat, title: "Módulo de Capacitación", description: "Analiza, gestiona y captura el progreso de la formación del personal."},
    { href: "/reportes", icon: BarChart, title: "Reportes y Diagnósticos", description: "Genera informes y obtén una visión general del estado del personal." },
    { href: "/inicio/plan-de-carrera", icon: GitBranch, title: "Plan de Carrera", description: "Visualiza la lógica y requisitos para los cambios de categoría en cada puesto." },
    { href: "/perfil", icon: User, title: "Perfil de Empleado", description: "Consulta el perfil detallado de un empleado." }
];


export default function InicioPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const currentUserInfoRef = useMemoFirebase(
      () => (user ? doc(firestore, 'usuarios', user.uid) : null),
      [user, firestore]
    );
    const { data: currentUserData } = useDoc<UserData>(currentUserInfoRef);
    
    const userName = useMemo(() => {
        return currentUserData?.nombre || user?.displayName || 'Usuario';
    }, [currentUserData, user]);


  return (
    <div className="h-full w-full">
      <div className="space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
            Bienvenido, {userName}
        </h1>
        <p className="text-lg text-muted-foreground max-w-4xl">
          Herramientas y diagnósticos para la gestión de talento y capacitación.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {navLinks.map((item) => (
             <Link key={item.href} href={item.href} className="block hover:no-underline group">
                <motion.div
                    whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-full"
                >
                    <Card className="h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/60 border-border/50 hover:border-primary/50 backdrop-blur-sm">
                        <motion.div
                            whileHover={{ rotateY: 180, transition: { duration: 0.5 } }}
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

