'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { BookMarked, BarChart3, Briefcase, ClipboardPlus, BookCopy } from 'lucide-react';


export default function CapacitacionPage() {
  return (
    <div className="space-y-8">
       <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Módulo de Capacitación</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestiona y analiza las capacitaciones del personal.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Link href="/capacitacion/matriz-de-habilidades" className="block hover:no-underline group">
            <Card className="h-full hover:border-primary/50 transition-all">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <BookMarked className="h-6 w-6 text-primary"/>
                        Matriz de Habilidades
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Define y asigna los cursos obligatorios para cada puesto de trabajo en la organización.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/capacitacion/captura" className="block hover:no-underline group">
            <Card className="h-full hover:border-primary/50 transition-all">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <ClipboardPlus className="h-6 w-6 text-primary"/>
                        Captura de Cursos
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Registra los cursos completados por el personal para mantener el sistema actualizado.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/capacitacion/analisis" className="block hover:no-underline group">
            <Card className="h-full hover:border-primary/50 transition-all">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <BarChart3 className="h-6 w-6 text-primary"/>
                        Análisis de Cumplimiento
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Visualiza el progreso y cumplimiento de la capacitación en toda la planta.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/capacitacion/analisis-por-puesto" className="block hover:no-underline group">
            <Card className="h-full hover:border-primary/50 transition-all">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <Briefcase className="h-6 w-6 text-primary"/>
                        Análisis por Puesto
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Revisa el estado de la capacitación detallado para un puesto de trabajo específico.</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="/capacitacion/analisis-por-curso" className="block hover:no-underline group">
            <Card className="h-full hover:border-primary/50 transition-all">
                <CardHeader className="p-6">
                    <CardTitle className="text-xl font-semibold flex items-center gap-3">
                        <BookCopy className="h-6 w-6 text-primary"/>
                        Análisis por Curso
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <CardDescription>Audita el cumplimiento y el personal asignado para cada curso individualmente.</CardDescription>
                </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  );
}
