
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { ClipboardList, BookCopy, AlertTriangle, FileDown, GitBranch, CalendarClock } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import React, { useMemo } from 'react';
import { doc } from 'firebase/firestore';


// Interfaces
interface UserData {
    id: string; // Corresponds to UID
    email: string;
    nombre?: string;
    role: 'admin' | 'lector';
}

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
        <Link href="/vacaciones" className="block hover:no-underline group">
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden bg-card border-border/50 hover:border-primary/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <CalendarClock className="h-6 w-6 text-primary"/>
                        Gestión de Vacaciones
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Visualiza el calendario de ausencias y programa las vacaciones del personal.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/diagnostico/puestos" className="block hover:no-underline group">
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden bg-card border-border/50 hover:border-primary/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-primary"/>
                        Diagnóstico de Puestos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Ver un listado de todos los puestos de trabajo únicos registrados en la plantilla.</CardDescription>
                </CardContent>
            </Card>
        </Link>
         <Link href="/diagnostico/cursos" className="block hover:no-underline group">
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden bg-card border-border/50 hover:border-primary/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <BookCopy className="h-6 w-6 text-primary"/>
                        Catálogo de Cursos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Consulta todos los cursos disponibles en el sistema para la asignación de capacitaciones.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/diagnostico/matriz-faltante" className="block hover:no-underline group">
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden bg-card border-border/50 hover:border-amber-500/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-amber-400"/>
                        Puestos sin Matriz
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Identifica los puestos que aún no tienen una matriz de habilidades asignada.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/inicio/plan-de-carrera" className="block hover:no-underline group">
            <Card className="rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 h-full overflow-hidden bg-card border-border/50 hover:border-primary/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <GitBranch className="h-6 w-6 text-primary"/>
                        Plan de Carrera
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Visualiza la lógica y requisitos para los cambios de categoría en cada puesto.</CardDescription>
                </CardContent>
            </Card>
        </Link>
       </div>
    </div>
  );
}
