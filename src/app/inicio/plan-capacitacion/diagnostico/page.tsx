
'use client';
import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BookX, Loader2, ArrowDown, Briefcase } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// Interfaces
interface Empleado { id: string; puesto: { titulo: string; }; id_empleado: string; }
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface Historial { id: string; id_empleado: string; cursos: { id_curso: string; calificacion: number; }[]; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }

export default function DiagnosticoPage() {
    const firestore = useFirestore();

    const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
    const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
    const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
    const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

    const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
    const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
    const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
    const { data: catalogoCursos, isLoading: l4 } = useCollection<CursoCatalogo>(catalogoCursosRef);
    
    const isLoading = l1 || l2 || l3 || l4;

    const analisisPrioridades = useMemo(() => {
        if (isLoading || !empleados || !perfiles || !historiales || !catalogoCursos) {
            return { puestosCriticos: [], cursosCriticos: [] };
        }

        // 1. Puestos Críticos
        const historialesMap = new Map(historiales.map(h => [h.id_empleado, new Set(h.cursos?.filter(c => c.calificacion >= 70).map(c => c.id_curso))]));
        
        const cumplimientoPorPuesto = perfiles.map(perfil => {
            const empleadosEnPuesto = empleados.filter(e => e.puesto.titulo === perfil.nombre_puesto);
            if (empleadosEnPuesto.length === 0) return null;

            const cursosObligatorios = new Set(perfil.cursos_obligatorios);
            if(cursosObligatorios.size === 0) return null;
            
            let totalPorcentaje = 0;
            empleadosEnPuesto.forEach(emp => {
                const cursosCompletados = historialesMap.get(emp.id_empleado) || new Set();
                const completadosObligatorios = Array.from(cursosCompletados).filter(c => cursosObligatorios.has(c));
                totalPorcentaje += (completadosObligatorios.length / cursosObligatorios.size) * 100;
            });

            return {
                nombre: perfil.nombre_puesto,
                cumplimiento: totalPorcentaje / empleadosEnPuesto.length,
                empleadosCount: empleadosEnPuesto.length
            };
        }).filter((p): p is { nombre: string; cumplimiento: number; empleadosCount: number; } => p !== null && p.cumplimiento < 100);

        const puestosCriticos = cumplimientoPorPuesto.sort((a,b) => a.cumplimiento - b.cumplimiento).slice(0,10);

        // 2. Cursos Críticos
        const asignacionesPorCurso: Record<string, { total: number, completados: number }> = {};
        perfiles.forEach(perfil => {
            const empleadosEnPuesto = empleados.filter(e => e.puesto.titulo === perfil.nombre_puesto);
            perfil.cursos_obligatorios.forEach(cursoId => {
                if(!asignacionesPorCurso[cursoId]) {
                    asignacionesPorCurso[cursoId] = { total: 0, completados: 0};
                }
                asignacionesPorCurso[cursoId].total += empleadosEnPuesto?.length || 0;
                empleadosEnPuesto?.forEach(emp => {
                    const cursosCompletados = historialesMap.get(emp.id_empleado);
                    if(cursosCompletados?.has(cursoId)) {
                        asignacionesPorCurso[cursoId].completados++;
                    }
                })
            });
        });
        
        const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c.nombre_oficial]));

        const cumplimientoPorCurso = Object.entries(asignacionesPorCurso).map(([id_curso, data]) => ({
            nombre: catalogoMap.get(id_curso) || `Curso ID: ${id_curso}`,
            cumplimiento: data.total > 0 ? (data.completados / data.total) * 100 : 100,
            asignados: data.total,
        })).filter(c => c.cumplimiento < 100 && c.asignados > 0);

        const cursosCriticos = cumplimientoPorCurso.sort((a,b) => a.cumplimiento - b.cumplimiento).slice(0,10);
        
        return { puestosCriticos, cursosCriticos };
    }, [isLoading, empleados, perfiles, historiales, catalogoCursos]);


    return (
        <div className="space-y-8">
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold tracking-tight">Diagnóstico de Capacitación</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Puntos de atención prioritarios basados en datos de cumplimiento.
                </p>
            </div>
            {isLoading ? (
                 <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { staggerChildren: 0.2 } }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <motion.div initial={{ y: 20 }} animate={{ y: 0 }}>
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Briefcase className="h-6 w-6 text-red-500" />Puestos Críticos</CardTitle>
                            <CardDescription>Top 10 puestos con menor cumplimiento de capacitación.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[50vh]">
                                <div className="space-y-4 pr-4">
                                {analisisPrioridades.puestosCriticos.map(puesto => (
                                    <div key={puesto.nombre}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-sm truncate pr-4">{puesto.nombre}</span>
                                            <Badge variant="destructive">{puesto.cumplimiento.toFixed(0)}%</Badge>
                                        </div>
                                        <Progress value={puesto.cumplimiento} indicatorClassName="bg-red-500"/>
                                        <p className="text-xs text-muted-foreground mt-1">{puesto.empleadosCount} empleados en el puesto.</p>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div initial={{ y: 20 }} animate={{ y: 0 }}>
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><BookX className="h-6 w-6 text-amber-500" />Cursos Críticos</CardTitle>
                            <CardDescription>Top 10 cursos con menor tasa de aprobación general.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-[50vh]">
                                <div className="space-y-4 pr-4">
                                {analisisPrioridades.cursosCriticos.map(curso => (
                                    <div key={curso.nombre}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-sm truncate pr-4">{curso.nombre}</span>
                                            <Badge variant="destructive">{curso.cumplimiento.toFixed(0)}%</Badge>
                                        </div>
                                        <Progress value={curso.cumplimiento} indicatorClassName="bg-amber-500" />
                                         <p className="text-xs text-muted-foreground mt-1">{curso.asignados} empleados asignados a este curso.</p>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
            )}
        </div>
    );
}
