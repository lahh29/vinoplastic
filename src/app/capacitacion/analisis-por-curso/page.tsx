'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BookCopy, Users, UserCheck, UserX, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Interfaces
interface Empleado { id: string; id_empleado: string; nombre_completo: string; puesto: { titulo: string; departamento: string; }; }
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface Historial { id: string; id_empleado: string; cursos: { id_curso: string; calificacion: number; }[]; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }

interface EmpleadoAsignado {
    id_empleado: string;
    nombre_completo: string;
    puesto: string;
    estatus: 'Completado' | 'Pendiente';
}

export default function AnalisisPorCursoPage() {
  const firestore = useFirestore();

  // Data Fetching
  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
  const { data: catalogoCursos, isLoading: l4 } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const [selectedCurso, setSelectedCurso] = useState<CursoCatalogo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = l1 || l2 || l3 || l4;

  const sortedCursos = useMemo(() => {
    if (!catalogoCursos) return [];
    return [...catalogoCursos].sort((a,b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos]);
  
  const filteredCursos = useMemo(() => {
    return sortedCursos.filter(c => c.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase()));
  },[sortedCursos, searchTerm])

  const analisisPorCurso = useMemo(() => {
    if (!selectedCurso || isLoading) return null;

    // 1. Encontrar todos los puestos que requieren el curso seleccionado
    const puestosRequeridos = new Set(
        perfiles?.filter(p => p.cursos_obligatorios.includes(selectedCurso.id_curso)).map(p => p.nombre_puesto)
    );

    // 2. Encontrar todos los empleados en esos puestos
    const empleadosAsignados = empleados?.filter(e => puestosRequeridos.has(e.puesto.titulo));
    
    if(!empleadosAsignados) return { empleados: [], kpis: { total: 0, completados: 0, pendientes: 0, cumplimiento: 0 }};

    // 3. Revisar el historial de cada empleado asignado
    const historialesMap = new Map(historiales?.map(h => [h.id_empleado, new Set(h.cursos.filter(c => c.calificacion >= 70).map(c => c.id_curso))]));

    const empleadosDetalle: EmpleadoAsignado[] = empleadosAsignados.map(emp => {
        const cursosCompletados = historialesMap.get(emp.id_empleado);
        const estatus = cursosCompletados?.has(selectedCurso.id_curso) ? 'Completado' : 'Pendiente';
        return {
            id_empleado: emp.id_empleado,
            nombre_completo: emp.nombre_completo,
            puesto: emp.puesto.titulo,
            estatus
        }
    });

    const completados = empleadosDetalle.filter(e => e.estatus === 'Completado').length;
    const total = empleadosDetalle.length;
    const cumplimiento = total > 0 ? (completados / total) * 100 : 0;

    return {
        empleados: empleadosDetalle,
        kpis: {
            total,
            completados,
            pendientes: total - completados,
            cumplimiento
        }
    }
  }, [selectedCurso, empleados, perfiles, historiales, isLoading]);


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Analizando datos del sistema...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6">
      <Card className="w-full lg:max-w-md lg:w-1/3 flex flex-col shadow-lg border-border/50 bg-card rounded-2xl">
        <CardHeader className="p-6 border-b border-border/50">
          <CardTitle className="flex items-center gap-3 text-xl"><BookCopy className="h-5 w-5 text-primary" /> Catálogo de Cursos</CardTitle>
          <CardDescription>{catalogoCursos?.length || 0} cursos encontrados.</CardDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar curso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-2 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
              {filteredCursos.map(curso => (
                <Button key={curso.id} variant="ghost" className={cn("justify-start text-left h-auto py-3 px-4 text-wrap font-normal transition-all duration-200", selectedCurso?.id === curso.id ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={() => setSelectedCurso(curso)}>
                  <span className="flex-1">{curso.nombre_oficial}</span>
                  {selectedCurso?.id === curso.id && <ChevronRight className="h-4 w-4 opacity-50 ml-2 shrink-0" />}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="flex-1 flex flex-col shadow-lg border-border/50 bg-card rounded-2xl">
        <CardHeader className="p-6 border-b border-border/50">
          <CardTitle className='flex items-center gap-3 text-2xl'><BookCopy className="h-6 w-6 text-primary" /> Análisis de Curso</CardTitle>
          <CardDescription className="text-base pt-1">{selectedCurso ? `Mostrando métricas para: ${selectedCurso.nombre_oficial}` : 'Selecciona un curso para ver el detalle.'}</CardDescription>
        </CardHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedCurso && analisisPorCurso ? (
            <div className="flex flex-1 flex-col h-full">
              <CardContent className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users size={16} /> Total Asignado</div>
                    <div className="text-3xl font-bold">{analisisPorCurso.kpis.total}</div>
                </div>
                 <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><UserCheck size={16} /> Completados</div>
                    <div className="text-3xl font-bold text-emerald-500">{analisisPorCurso.kpis.completados}</div>
                </div>
                 <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><UserX size={16} /> Pendientes</div>
                    <div className="text-3xl font-bold text-red-500">{analisisPorCurso.kpis.pendientes}</div>
                </div>
                 <div className="p-4 rounded-lg bg-secondary/50">
                    <div className="text-sm font-medium text-muted-foreground">Cumplimiento</div>
                     <div className="flex items-center gap-2 mt-2">
                        <Progress value={analisisPorCurso.kpis.cumplimiento} className="h-2" />
                        <span className="text-lg font-bold">{analisisPorCurso.kpis.cumplimiento.toFixed(0)}%</span>
                    </div>
                </div>
              </CardContent>

              <div className="flex-1 relative border-t border-border/50">
                <ScrollArea className="absolute inset-0">
                    <Table>
                      <TableHeader className="bg-secondary/50 sticky top-0 z-10"><TableRow><TableHead>Colaborador</TableHead><TableHead>Puesto</TableHead><TableHead>Estatus</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {analisisPorCurso.empleados.length > 0 ? (
                          analisisPorCurso.empleados.map(emp => (
                            <TableRow key={emp.id_empleado} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{emp.nombre_completo}</TableCell>
                              <TableCell>{emp.puesto}</TableCell>
                              <TableCell>
                                <Badge variant={emp.estatus === 'Completado' ? 'default' : 'destructive'} className={cn(emp.estatus === 'Completado' && 'bg-emerald-500/80')}>{emp.estatus}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (<TableRow><TableCell colSpan={3} className="h-64 text-center text-muted-foreground">No hay personal asignado a este curso.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                </ScrollArea>
              </div>
            </div>
          ) : (
             <div className="flex flex-1 flex-col items-center justify-center h-full text-center p-12"><div className="h-24 w-24 rounded-full bg-secondary/70 flex items-center justify-center mb-6 ring-8 ring-border"><BookCopy className="h-12 w-12 text-muted-foreground/60" /></div><h3 className="text-2xl font-semibold text-foreground mb-2">Selecciona un Curso</h3><p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">Elige un curso de la lista para ver su estado de cumplimiento, el personal asignado y el progreso general.</p></div>
          )}
        </div>
      </Card>
    </div>
  );
}
