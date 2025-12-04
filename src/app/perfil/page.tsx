
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2, User, Briefcase, BookOpen, CheckCircle2, XCircle, Clock, Award, Target, CalendarDays, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInMonths, isValid, intervalToDuration } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Interfaces
interface Empleado { id: string; id_empleado: string; nombre_completo: string; puesto: { titulo: string; departamento: string; }; fecha_ingreso?: { toDate: () => Date }; }
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface Historial { id: string; id_empleado: string; cursos: { id_curso: string; calificacion: number; }[]; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }
interface Promocion { id: string; fecha_ultimo_cambio?: { toDate: () => Date }; examen_teorico?: number; evaluacion_desempeno?: number; no_apto?: boolean; }
interface ReglaAscenso { id: string; puesto_actual: string; puesto_siguiente: string; meses_minimos: number; min_evaluacion_desempeno: number; min_examen_teorico?: number; min_cobertura_matriz: number;}

interface CursoConEstado {
    curso: CursoCatalogo;
    estado: 'Aprobado' | 'Reprobado' | 'Pendiente';
    calificacion?: number;
}
interface EmpleadoPerfil extends Empleado { 
    promocionData?: Promocion;
    coberturaCursos: number; 
    cursosConEstado: CursoConEstado[];
}
type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente' | 'No Apto';

// Helpers
const parseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  return null;
};

const getStatusInfo = (empleado: EmpleadoPerfil, regla?: ReglaAscenso): { status: EstatusPromocion, message: string } => {
    if (empleado.promocionData?.no_apto) return { status: 'No Apto', message: 'Marcado manualmente como no apto.' };
    if (!regla) return { status: 'Máxima Categoría', message: 'Este puesto no tiene una categoría superior definida en el plan de carrera.' };

    const fechaCambio = empleado.promocionData?.fecha_ultimo_cambio ? parseDate(empleado.promocionData.fecha_ultimo_cambio) : parseDate(empleado.fecha_ingreso);
    if (!fechaCambio) return { status: 'Pendiente', message: 'Se necesita registrar la fecha del último cambio o de ingreso.' };

    const mesesDesdeCambio = differenceInMonths(new Date(), fechaCambio);
    if (mesesDesdeCambio < regla.meses_minimos) return { status: 'En Progreso', message: `En período de espera. Necesita ${regla.meses_minimos} meses y tiene ${mesesDesdeCambio}.` };
    
    const evaluacionDesempeno = empleado.promocionData?.evaluacion_desempeno;
    if (evaluacionDesempeno === undefined || evaluacionDesempeno < regla.min_evaluacion_desempeno) return { status: 'Requiere Atención', message: `Evaluación de desempeño pendiente o inferior a ${regla.min_evaluacion_desempeno}.` };

    if (regla.min_examen_teorico && (empleado.promocionData?.examen_teorico === undefined || empleado.promocionData.examen_teorico < regla.min_examen_teorico)) return { status: 'Requiere Atención', message: `Examen teórico pendiente o inferior a ${regla.min_examen_teorico}.` };
    
    if (empleado.coberturaCursos < regla.min_cobertura_matriz) return { status: 'Requiere Atención', message: `Cobertura de cursos insuficiente. Requiere ${regla.min_cobertura_matriz}% y tiene ${empleado.coberturaCursos.toFixed(0)}%.` };
    
    return { status: 'Elegible', message: 'Cumple con todos los criterios para ser evaluado para promoción.' };
};
const statusColors: Record<EstatusPromocion, string> = { 'Elegible': 'bg-green-500', 'En Progreso': 'bg-blue-500', 'Máxima Categoría': 'bg-gradient-to-r from-purple-500 to-indigo-600', 'Requiere Atención': 'bg-orange-500', 'Pendiente': 'bg-gray-400', 'No Apto': 'bg-zinc-600' };

const CursosTable = ({ cursos }: { cursos: EmpleadoPerfil['cursosConEstado'] }) => {
    return (
        <ScrollArea className="h-[70vh] rounded-lg border">
            <Table>
                <TableHeader className='sticky top-0 bg-background z-10'>
                    <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead className="text-center w-32">Calificación</TableHead>
                        <TableHead className="text-right w-32">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cursos.map(({ curso, estado, calificacion }) => (
                        <TableRow key={curso.id}>
                            <TableCell className="font-medium">{curso.nombre_oficial}</TableCell>
                            <TableCell className="text-center font-mono">{calificacion ?? '-'}</TableCell>
                            <TableCell className="text-right">
                                <Badge variant={estado === 'Aprobado' ? 'default' : estado === 'Reprobado' ? 'destructive' : 'outline'} className={cn(estado === 'Aprobado' && 'bg-green-500')}>{estado}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {cursos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No hay cursos asignados a este puesto.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};


export default function PerfilPage() {
  const firestore = useFirestore();
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoPerfil | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const promocionesRef = useMemoFirebase(() => collection(firestore, 'Promociones'), [firestore]);
  const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
  const { data: promociones, isLoading: l4 } = useCollection<Promocion>(promocionesRef);
  const { data: reglasAscenso, isLoading: l5 } = useCollection<ReglaAscenso>(reglasAscensoRef);
  const { data: catalogoCursos, isLoading: l6 } = useCollection<CursoCatalogo>(catalogoCursosRef);
  
  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  const handleSelectEmpleado = (empleadoId: string) => {
    if (isLoading) return;
    const empleado = empleados?.find(e => e.id_empleado === empleadoId);
    if (!empleado) return;

    const perfil = perfiles?.find(p => p.nombre_puesto === empleado.puesto.titulo);
    const historial = historiales?.find(h => h.id_empleado === empleado.id_empleado);
    const promocionData = promociones?.find(p => p.id === empleado.id_empleado);
    const catalogoMap = new Map(catalogoCursos?.map(c => [c.id_curso, c]));
    
    let cursosConEstado: EmpleadoPerfil['cursosConEstado'] = [];
    let coberturaCursos = 0;
    
    if (perfil?.cursos_obligatorios) {
        const cursosCompletadosMap = new Map(historial?.cursos?.map(c => [c.id_curso, c.calificacion]));
        cursosConEstado = perfil.cursos_obligatorios.map(idCurso => {
            const cursoInfo = catalogoMap.get(idCurso) || { id: idCurso, id_curso: idCurso, nombre_oficial: `Curso no encontrado (${idCurso})` };
            const calificacion = cursosCompletadosMap.get(idCurso);
            let estado: 'Aprobado' | 'Reprobado' | 'Pendiente' = 'Pendiente';
            if (calificacion !== undefined) {
                estado = calificacion >= 70 ? 'Aprobado' : 'Reprobado';
            }
            return { curso: cursoInfo, estado, calificacion };
        });
        const aprobados = cursosConEstado.filter(c => c.estado === 'Aprobado').length;
        coberturaCursos = perfil.cursos_obligatorios.length > 0 ? (aprobados / perfil.cursos_obligatorios.length) * 100 : 100;
    }
    
    setSelectedEmpleado({ ...empleado, promocionData, coberturaCursos, cursosConEstado });
    setIsPopoverOpen(false);
  };
  
  const reglaAplicable = reglasAscenso?.find(r => r.puesto_actual === selectedEmpleado?.puesto.titulo);
  const statusInfo = selectedEmpleado ? getStatusInfo(selectedEmpleado, reglaAplicable) : null;
  
  const antiguedad = useMemo(() => {
    if (!selectedEmpleado?.fecha_ingreso) return null;
    const fechaIngreso = parseDate(selectedEmpleado.fecha_ingreso);
    if (!fechaIngreso) return null;
    
    const duracion = intervalToDuration({ start: fechaIngreso, end: new Date() });
    
    const parts = [];
    if (duracion.years && duracion.years > 0) parts.push(`${duracion.years} años`);
    if (duracion.months && duracion.months > 0) parts.push(`${duracion.months} meses`);
    if (duracion.days && duracion.days > 0) parts.push(`${duracion.days} días`);
    if(parts.length === 0) return "Menos de un día";

    return parts.join(', ');
  }, [selectedEmpleado]);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Buscador de Perfil de Empleado</CardTitle>
          <CardDescription>Busca un empleado por nombre o ID para ver su perfil completo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full md:w-[400px] justify-between">
                    {selectedEmpleado ? `${selectedEmpleado.nombre_completo} (${selectedEmpleado.id_empleado})` : "Seleccionar empleado..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Buscar por nombre o ID..." />
                    <CommandList>
                        <ScrollArea className="h-72">
                            <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                            <CommandGroup>
                                {(empleados || []).map(emp => (
                                    <CommandItem key={emp.id} onSelect={() => handleSelectEmpleado(emp.id_empleado)} value={`${emp.nombre_completo} ${emp.id_empleado}`}>
                                        <Check className={cn("mr-2 h-4 w-4", selectedEmpleado?.id_empleado === emp.id_empleado ? "opacity-100" : "opacity-0")} />
                                        {emp.nombre_completo}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {isLoading && <div className="flex justify-center items-center p-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>}
      
      {selectedEmpleado && !isLoading && (
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 0.5}} className="space-y-8">
            <Card className={cn("overflow-hidden", statusColors[statusInfo!.status])}>
                <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center justify-between">
                        <div>{selectedEmpleado.nombre_completo}</div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="secondary" className="text-base flex items-center gap-2 cursor-help">
                                    {statusInfo?.status}
                                    {statusInfo?.status === 'Máxima Categoría' && (
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1], color: ['#fde047', '#facc15', '#eab308', '#facc15', '#fde047'] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <Sparkles className="h-4 w-4"/>
                                        </motion.div>
                                    )}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{statusInfo?.message}</p>
                            </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                    </CardTitle>
                    <CardDescription className="text-white/80">{selectedEmpleado.puesto.titulo} | {selectedEmpleado.puesto.departamento}</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Card className="h-full">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><motion.div whileHover={{color: 'hsl(var(--primary))'}}><CalendarDays/></motion.div> Antigüedad</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Fecha de Ingreso</Label><p className="text-lg font-bold">{selectedEmpleado.fecha_ingreso ? format(parseDate(selectedEmpleado.fecha_ingreso)!, 'dd MMM, yyyy', {locale: es}) : 'N/A'}</p></div>
                            <div><Label>Tiempo en la Empresa</Label><p className="text-md font-semibold text-muted-foreground">{antiguedad || 'N/A'}</p></div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Card className="h-full">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><motion.div whileHover={{color: 'hsl(var(--primary))'}}><Award/></motion.div>Evaluaciones</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div><Label>Evaluación de Desempeño</Label><p className="text-2xl font-bold">{selectedEmpleado.promocionData?.evaluacion_desempeno ?? 'N/A'}</p></div>
                            <div><Label>Examen Teórico</Label><p className="text-2xl font-bold">{selectedEmpleado.promocionData?.examen_teorico ?? 'N/A'}</p></div>
                        </CardContent>
                    </Card>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Card className="h-full">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><motion.div whileHover={{color: 'hsl(var(--primary))'}}><Target/></motion.div>Plan de Carrera</CardTitle></CardHeader>
                        <CardContent>
                            {reglaAplicable ? (
                            <ul className="space-y-1 text-sm">
                                <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary"/>Siguiente Puesto: <span className="font-bold">{reglaAplicable.puesto_siguiente}</span></li>
                                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/>Meses Mínimos: <span className="font-bold">{reglaAplicable.meses_minimos}</span></li>
                                <li className="flex items-center gap-2"><Award className="h-4 w-4 text-primary"/>Desempeño ≥ <span className="font-bold">{reglaAplicable.min_evaluacion_desempeno}</span></li>
                                {reglaAplicable.min_examen_teorico && <li className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary"/>Examen ≥ <span className="font-bold">{reglaAplicable.min_examen_teorico}%</span></li>}
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary"/>Cursos ≥ <span className="font-bold">{reglaAplicable.min_cobertura_matriz}%</span></li>
                            </ul>
                        ) : (<p className="text-sm text-muted-foreground">No hay plan de carrera definido para este puesto.</p>)}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
            
            <Card>
                <CardHeader>
                     <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                           <BookOpen/>Matriz de Habilidades
                        </CardTitle>
                        {selectedEmpleado.cursosConEstado.length > 0 && (
                            <Badge variant="secondary" className="text-base">
                                {selectedEmpleado.cursosConEstado.filter(c => c.estado === 'Aprobado').length} / {selectedEmpleado.cursosConEstado.length}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                   <CursosTable cursos={selectedEmpleado.cursosConEstado} />
                </CardContent>
            </Card>
        </motion.div>
      )}
    </div>
  );
}

