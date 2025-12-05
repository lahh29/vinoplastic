
'use client';
import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, BookCheck, Users, Percent, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

// Interfaces
interface HistorialCurso { id_curso: string; calificacion: number; fecha_aplicacion: string; }
interface Historial { id: string; id_empleado: string; cursos: HistorialCurso[]; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }

interface TrimestreData {
    nombre: string;
    totalCursos: number;
    empleadosCapacitados: number;
    promedioCalificacion: number;
    cursosDetalle: { nombre: string; count: number }[];
}

// Helpers
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(date.getTime()) ? null : date;
};

const getQuarter = (date: Date): number => {
    const month = date.getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
};

export default function MedicionPage() {
    const firestore = useFirestore();

    const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
    const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

    const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
    const { data: catalogoCursos, isLoading: l4 } = useCollection<CursoCatalogo>(catalogoCursosRef);
    
    const isLoading = l3 || l4;

    const analisisTrimestral = useMemo(() => {
        if (isLoading || !historiales || !catalogoCursos) {
            return [];
        }
        
        const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c.nombre_oficial]));
        
        const trimestres: { [key: number]: { cursos: HistorialCurso[], empleados: Set<string> } } = { 1: { cursos: [], empleados: new Set() }, 2: { cursos: [], empleados: new Set() }, 3: { cursos: [], empleados: new Set() }, 4: { cursos: [], empleados: new Set() } };

        historiales.forEach(hist => {
            hist.cursos?.forEach(curso => {
                const fecha = parseDate(curso.fecha_aplicacion);
                if (fecha && fecha.getFullYear() === 2026) {
                    const q = getQuarter(fecha);
                    trimestres[q].cursos.push(curso);
                    trimestres[q].empleados.add(hist.id_empleado);
                }
            });
        });
        
        return Object.entries(trimestres).map(([num, data]): TrimestreData => {
            const totalCalificaciones = data.cursos.reduce((acc, c) => acc + c.calificacion, 0);
            const promedio = data.cursos.length > 0 ? totalCalificaciones / data.cursos.length : 0;
            
            const cursosCount: Record<string, number> = {};
            data.cursos.forEach(c => {
                const nombreCurso = catalogoMap.get(c.id_curso) || c.id_curso;
                cursosCount[nombreCurso] = (cursosCount[nombreCurso] || 0) + 1;
            });
            
            const cursosDetalle = Object.entries(cursosCount)
                .map(([nombre, count]) => ({ nombre, count }))
                .sort((a,b) => b.count - a.count);

            return {
                nombre: `Trimestre ${num}`,
                totalCursos: data.cursos.length,
                empleadosCapacitados: data.empleados.size,
                promedioCalificacion: promedio,
                cursosDetalle
            };
        });

    }, [isLoading, historiales, catalogoCursos]);


    return (
        <div className="space-y-8">
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold tracking-tight">Medición de Resultados (2026)</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Dashboard para el análisis trimestral del plan de capacitación.
                </p>
            </div>
            {isLoading ? (
                 <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { staggerChildren: 0.1 } }} className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-6 items-start">
                {analisisTrimestral.map(trimestre => (
                    <motion.div key={trimestre.nombre} initial={{ y: 20, opacity: 0}} animate={{y:0, opacity: 1}}>
                        <Card className="rounded-2xl shadow-lg h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-xl"><Calendar className="h-5 w-5 text-primary"/>{trimestre.nombre}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex justify-between items-baseline p-3 bg-secondary rounded-lg">
                                    <Label className="flex items-center gap-2 text-muted-foreground"><BookCheck size={16}/>Cursos Impartidos</Label>
                                    <p className="text-2xl font-bold">{trimestre.totalCursos}</p>
                                </div>
                                <div className="flex justify-between items-baseline p-3 bg-secondary rounded-lg">
                                    <Label className="flex items-center gap-2 text-muted-foreground"><Users size={16}/>Personal Capacitado</Label>
                                    <p className="text-2xl font-bold">{trimestre.empleadosCapacitados}</p>
                                </div>
                                <div className="flex justify-between items-baseline p-3 bg-secondary rounded-lg">
                                    <Label className="flex items-center gap-2 text-muted-foreground"><Percent size={16}/>Promedio General</Label>
                                    <p className="text-2xl font-bold">{trimestre.promedioCalificacion.toFixed(1)}%</p>
                                </div>
                            </CardContent>
                             <CardFooter className="flex-col items-start pt-4">
                                <Label className="text-xs text-muted-foreground mb-2">Desglose de Cursos</Label>
                                <ScrollArea className="h-32 w-full">
                                    <div className="space-y-2 pr-4">
                                        {trimestre.cursosDetalle.length > 0 ? trimestre.cursosDetalle.map(c => (
                                            <div key={c.nombre} className="flex justify-between text-sm">
                                                <span className="truncate pr-2">{c.nombre}</span>
                                                <span className="font-bold flex-shrink-0">{c.count}</span>
                                            </div>
                                        )) : <p className="text-sm text-muted-foreground text-center italic py-4">Sin cursos en este trimestre.</p>}
                                    </div>
                                </ScrollArea>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
            )}
        </div>
    );
}

