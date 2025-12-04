
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Users, BarChart3, ChevronRight, BookOpen, BookCheck, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Interfaces (re-used from other pages for consistency)
interface Empleado {
  id: string;
  id_empleado: string;
  nombre_completo: string;
  puesto: { titulo: string; departamento: string; };
}
interface PerfilPuesto {
  id: string;
  nombre_puesto: string;
  cursos_obligatorios: string[];
}
interface Historial {
  id: string;
  id_empleado: string;
  cursos: { id_curso: string; calificacion: number; }[];
}
interface CursoCatalogo {
  id: string;
  nombre_oficial: string;
}

interface EmpleadoConCumplimiento {
    id_empleado: string;
    nombre_completo: string;
    departamento: string;
    porcentaje: number;
    cursos_completados: CursoCatalogo[];
    cursos_pendientes: CursoCatalogo[];
}

export default function AnalisisPorPuestoPage() {
  const firestore = useFirestore();

  // Data Fetching
  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: loadingPerfiles } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: loadingHistoriales } = useCollection<Historial>(historialRef);
  const { data: catalogoCursos, isLoading: loadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const [selectedPuesto, setSelectedPuesto] = useState<string | null>(null);
  const [selectedEmpleadoModal, setSelectedEmpleadoModal] = useState<EmpleadoConCumplimiento | null>(null);

  const isLoading = loadingEmpleados || loadingPerfiles || loadingHistoriales || loadingCursos;

  const puestosUnicos = useMemo(() => {
    if (!empleados) return [];
    const puestos = new Set<string>();
    empleados.forEach(emp => {
      if (emp.puesto && emp.puesto.titulo) {
        puestos.add(emp.puesto.titulo);
      }
    });
    return Array.from(puestos).sort();
  }, [empleados]);

  const analisisPorPuesto = useMemo(() => {
    if (!selectedPuesto || !empleados || !perfiles || !historiales || !catalogoCursos) {
      return { empleadosEnPuesto: [], cumplimientoPromedio: 0 };
    }

    const perfil = perfiles.find(p => p.nombre_puesto === selectedPuesto);
    const historialesMap = new Map(historiales.map(h => [h.id_empleado, new Set(h.cursos.filter(c => c.calificacion >= 70).map(c => c.id_curso))]));
    const catalogoMap = new Map(catalogoCursos.map(c => [c.id, c.nombre_oficial]));

    const empleadosFiltrados = empleados.filter(e => e.puesto.titulo === selectedPuesto);

    if (!perfil) {
        const empleadosEnPuesto = empleadosFiltrados.map(e => ({
            id_empleado: e.id_empleado,
            nombre_completo: e.nombre_completo,
            departamento: e.puesto.departamento,
            porcentaje: 0,
            cursos_completados: [],
            cursos_pendientes: []
        }));
      return { empleadosEnPuesto, cumplimientoPromedio: 0 };
    }
    
    const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
    let totalPorcentaje = 0;

    const empleadosEnPuesto = empleadosFiltrados.map((empleado): EmpleadoConCumplimiento => {
      const cursosCompletadosIds = historialesMap.get(empleado.id_empleado) || new Set();
      
      const cursosCompletadosFiltradosIds = Array.from(cursosCompletadosIds).filter(id => cursosObligatoriosIds.has(id));
      const cursosPendientesIds = perfil.cursos_obligatorios.filter(id => !cursosCompletadosIds.has(id));

      const porcentaje = cursosObligatoriosIds.size > 0 ? (cursosCompletadosFiltradosIds.length / cursosObligatoriosIds.size) * 100 : 100;
      totalPorcentaje += porcentaje;

      return {
        id_empleado: empleado.id_empleado,
        nombre_completo: empleado.nombre_completo,
        departamento: empleado.puesto.departamento,
        porcentaje,
        cursos_completados: cursosCompletadosFiltradosIds.map(id => ({ id, nombre_oficial: catalogoMap.get(id) || 'N/A'})),
        cursos_pendientes: cursosPendientesIds.map(id => ({ id, nombre_oficial: catalogoMap.get(id) || 'N/A' })),
      };
    });
    
    const cumplimientoPromedio = empleadosEnPuesto.length > 0 ? totalPorcentaje / empleadosEnPuesto.length : 0;

    return { empleadosEnPuesto, cumplimientoPromedio };
  }, [selectedPuesto, empleados, perfiles, historiales, catalogoCursos]);


  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground animate-pulse">Cargando datos del sistema...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6">
      <Card className="w-full lg:max-w-xs lg:w-1/4 flex flex-col shadow-lg border-border/50 bg-card rounded-2xl">
        <CardHeader className="p-6 border-b border-border/50">
          <CardTitle className="flex items-center gap-3 text-xl">
            <Briefcase className="h-5 w-5 text-primary" /> 
            Puestos de Trabajo
          </CardTitle>
          <CardDescription>
            {puestosUnicos.length} puestos encontrados
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-2 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
              {puestosUnicos.map(puesto => (
                <Button
                  key={puesto}
                  variant="ghost"
                  className={cn(
                    "justify-start text-left h-auto py-3 px-4 text-wrap font-normal transition-all duration-200",
                    selectedPuesto === puesto 
                        ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedPuesto(puesto)}
                >
                  <span className="flex-1">{puesto}</span>
                  {selectedPuesto === puesto && <ChevronRight className="h-4 w-4 opacity-50 ml-2 shrink-0" />}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="flex-1 flex flex-col shadow-lg border-border/50 bg-card rounded-2xl">
        <CardHeader className="p-6 border-b border-border/50">
          <CardTitle className='flex items-center gap-3 text-2xl'>
            <BarChart3 className="h-6 w-6 text-primary" /> 
            Análisis de Cumplimiento
          </CardTitle>
          <CardDescription className="text-base pt-1">
            {selectedPuesto 
                ? `Métricas para: ${selectedPuesto}` 
                : 'Selecciona un puesto para comenzar.'}
          </CardDescription>
        </CardHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedPuesto ? (
            <div className="flex flex-1 flex-col h-full">
              
              <CardContent className="p-6">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Cumplimiento Global del Puesto</span>
                    <span className={cn(
                        "text-3xl font-bold",
                        analisisPorPuesto.cumplimientoPromedio >= 80 ? "text-emerald-500" :
                        analisisPorPuesto.cumplimientoPromedio >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                        {analisisPorPuesto.cumplimientoPromedio.toFixed(1)}%
                    </span>
                </div>
                <Progress 
                    value={analisisPorPuesto.cumplimientoPromedio} 
                    className="h-3 w-full" 
                    indicatorClassName={cn(
                        analisisPorPuesto.cumplimientoPromedio >= 80 ? 'bg-emerald-500' : 
                        analisisPorPuesto.cumplimientoPromedio >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                />
              </CardContent>

              <div className="flex-1 relative border-t border-border/50">
                <ScrollArea className="absolute inset-0">
                    <Table>
                      <TableHeader className="bg-secondary/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[120px]">ID Empleado</TableHead>
                          <TableHead>Colaborador</TableHead>
                          <TableHead className="w-[250px]">Progreso Individual</TableHead>
                           <TableHead className="text-right pr-6">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analisisPorPuesto.empleadosEnPuesto.length > 0 ? (
                          analisisPorPuesto.empleadosEnPuesto.map(emp => (
                            <TableRow key={emp.id_empleado} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-mono text-xs text-muted-foreground">{emp.id_empleado}</TableCell>
                              <TableCell className="font-medium text-foreground">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary shrink-0">
                                        {emp.nombre_completo.charAt(0)}
                                    </div>
                                    <span className="truncate">{emp.nombre_completo}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Progress value={emp.porcentaje} className="h-2.5" indicatorClassName={cn(
                                        emp.porcentaje >= 99 ? 'bg-emerald-500' :
                                        emp.porcentaje > 50 ? 'bg-amber-500' :
                                        'bg-red-500'
                                    )} />
                                  <span className={cn(
                                    "text-sm font-bold min-w-[3rem] text-right",
                                    emp.porcentaje === 100 ? "text-emerald-500" : "text-muted-foreground"
                                  )}>
                                    {emp.porcentaje.toFixed(0)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-4">
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedEmpleadoModal(emp)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <Users className="h-12 w-12 opacity-30" />
                                    <p className="font-semibold">No hay colaboradores asignados</p>
                                    <p className="text-sm">Actualmente no hay empleados en este puesto.</p>
                                </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                </ScrollArea>
              </div>
            </div>
          ) : (
             <div className="flex flex-1 flex-col items-center justify-center h-full text-center p-12">
                <div className="h-24 w-24 rounded-full bg-secondary/70 flex items-center justify-center mb-6 ring-8 ring-border">
                    <Briefcase className="h-12 w-12 text-muted-foreground/60" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">Selecciona un Puesto</h3>
                <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                   Elige un puesto para visualizar el desglose de cumplimiento y el detalle de cada colaborador.
                </p>
            </div>
          )}
        </div>
      </Card>
        {selectedEmpleadoModal && (
            <Dialog open={!!selectedEmpleadoModal} onOpenChange={() => setSelectedEmpleadoModal(null)}>
                <DialogContent className="sm:max-w-2xl bg-card rounded-2xl">
                     <DialogHeader>
                        <DialogTitle className="text-2xl">{selectedEmpleadoModal.nombre_completo}</DialogTitle>
                        <DialogDescription>
                            ID: {selectedEmpleadoModal.id_empleado} | {selectedPuesto}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh]">
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2 text-red-500"><BookOpen className="h-5 w-5"/>Cursos Pendientes ({selectedEmpleadoModal.cursos_pendientes.length})</h3>
                            <ScrollArea className="h-64 rounded-xl border p-3 bg-red-500/5">
                                <div className="space-y-2">
                                    {selectedEmpleadoModal.cursos_pendientes.length > 0 ? 
                                        selectedEmpleadoModal.cursos_pendientes.map(c => <div key={c.id} className="text-sm p-2 bg-card/80 rounded-md shadow-sm">{c.nombre_oficial}</div>) :
                                        <div className="text-sm text-center py-10 text-muted-foreground">¡Ninguno!</div>
                                    }
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2 text-emerald-500"><BookCheck className="h-5 w-5"/>Cursos Completados ({selectedEmpleadoModal.cursos_completados.length})</h3>
                            <ScrollArea className="h-64 rounded-xl border p-3 bg-emerald-500/5">
                                <div className="space-y-2">
                                    {selectedEmpleadoModal.cursos_completados.length > 0 ?
                                        selectedEmpleadoModal.cursos_completados.map(c => <div key={c.id} className="text-sm p-2 bg-card/80 rounded-md shadow-sm">{c.nombre_oficial}</div>) :
                                         <div className="text-sm text-center py-10 text-muted-foreground">Ninguno aún.</div>
                                    }
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )}
    </div>
  );
}
