
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserCheck, ShieldCheck, ClipboardEdit, Calendar as CalendarIcon, Percent, BookOpen, Clock, Award, AlertCircle, Users, Briefcase, ChevronRight, ArrowRight, Loader2, CheckCircle2, XCircle, MinusCircle, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format, isValid, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

// Interfaces
interface Empleado {
    id: string;
    id_empleado: string;
    nombre_completo: string;
    puesto: {
        titulo: string;
        departamento: string;
        area: string;
    };
    fecha_ingreso?: { toDate: () => Date };
}
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface Historial { id: string; id_empleado: string; cursos: { id_curso: string; calificacion: number; }[]; }
interface Promocion { id: string; fecha_ultimo_cambio?: { toDate: () => Date }; examen_teorico?: number; evaluacion_desempeno?: number; no_apto?: boolean; }
interface ReglaAscenso {
    id: string; // puesto_actual slug
    puesto_actual: string;
    puesto_siguiente: string;
    meses_minimos: number;
    min_evaluacion_desempeno: number;
    min_examen_teorico?: number;
    min_cobertura_matriz: number;
}

interface EmpleadoPromocion extends Empleado {
  promocionData?: Promocion;
  coberturaCursos: number;
}

const parseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  return null;
};

const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    const d = parseDate(date);
    if (!d || !isValid(d)) return 'Inválida';
    return format(d, 'dd/MMM/yy', { locale: es });
}

// Nueva lógica de estatus
type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente' | 'No Apto';


const getStatusInfo = (empleado: EmpleadoPromocion, reglasAscenso: ReglaAscenso[]): { status: EstatusPromocion, message: string, color: string } => {
    if (empleado.promocionData?.no_apto) {
        return { status: 'No Apto', message: 'Marcado manualmente como no apto para promoción.', color: 'bg-zinc-500' };
    }
    const puestoActual = empleado.puesto.titulo;
    const esCategoriaA = puestoActual.endsWith(' A');
    
    if (esCategoriaA && !reglasAscenso.some(r => r.puesto_actual === puestoActual)) {
        return { status: 'Máxima Categoría', message: 'El empleado ha alcanzado la categoría más alta en su plan de carrera.', color: 'bg-yellow-500' };
    }
    
    const regla = reglasAscenso.find(r => r.puesto_actual === puestoActual);
    
    if (!regla) {
        return { status: 'Pendiente', message: 'Puesto no aplica para plan de carrera o es la categoría inicial sin regla de ascenso.', color: 'bg-gray-400' };
    }
    
    const fechaCambio = empleado.promocionData?.fecha_ultimo_cambio 
      ? parseDate(empleado.promocionData.fecha_ultimo_cambio) 
      : parseDate(empleado.fecha_ingreso);
      
    if (!fechaCambio) return { status: 'Pendiente', message: 'Se necesita registrar la fecha del último cambio o de ingreso para evaluar.', color: 'bg-gray-400' };
    
    const mesesDesdeCambio = differenceInMonths(new Date(), fechaCambio);
    const { meses_minimos, min_cobertura_matriz, min_evaluacion_desempeno, min_examen_teorico } = regla;

    if (mesesDesdeCambio < meses_minimos) return { status: 'En Progreso', message: `En período de espera. Necesita ${meses_minimos} meses, actualmente tiene ${mesesDesdeCambio}.`, color: 'bg-blue-500' };
    
    const evaluacionDesempeno = empleado.promocionData?.evaluacion_desempeno;
    if (evaluacionDesempeno !== undefined && evaluacionDesempeno !== null && evaluacionDesempeno < min_evaluacion_desempeno) {
        return { status: 'Requiere Atención', message: `Evaluación de desempeño inferior a ${min_evaluacion_desempeno} (actual: ${evaluacionDesempeno}).`, color: 'bg-orange-500' };
    }
    
    const examenTeorico = empleado.promocionData?.examen_teorico;
    if (min_examen_teorico !== undefined && min_examen_teorico > 0) {
        if(examenTeorico === undefined || examenTeorico === null || examenTeorico < min_examen_teorico) {
            return { status: 'Requiere Atención', message: `Examen teórico pendiente o inferior a ${min_examen_teorico}. Calificación actual: ${examenTeorico ?? 'N/A'}.`, color: 'bg-orange-500' };
        }
    }

    if (empleado.coberturaCursos < min_cobertura_matriz) {
        return { status: 'Requiere Atención', message: `Tiempo de espera cumplido, pero requiere ${min_cobertura_matriz}% de cursos y tiene ${empleado.coberturaCursos.toFixed(0)}%.`, color: 'bg-orange-500' };
    }
    
    return { status: 'Elegible', message: `Cumple con el tiempo, cursos y evaluación. ¡Listo para ser evaluado!`, color: 'bg-green-600' };
};

export default function PromocionesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstatusPromocion | 'todos'>('todos');
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoPromocion | null>(null);
  const [empleadoAPromover, setEmpleadoAPromover] = useState<EmpleadoPromocion | null>(null);
  const [empleadoNoApto, setEmpleadoNoApto] = useState<EmpleadoPromocion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Form state
  const [fechaCambio, setFechaCambio] = useState<Date | undefined>();
  const [evalDesempeno, setEvalDesempeno] = useState<string>('');
  const [examenTeorico, setExamenTeorico] = useState<string>('');
  
  // Data fetching
  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const promocionesRef = useMemoFirebase(() => collection(firestore, 'Promociones'), [firestore]);
  const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);

  const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
  const { data: promociones, isLoading: l4 } = useCollection<Promocion>(promocionesRef);
  const { data: reglasAscenso, isLoading: l5 } = useCollection<ReglaAscenso>(reglasAscensoRef);
  
  const isLoading = l1 || l2 || l3 || l4 || l5;

  const areasUnicas = useMemo(() => {
    if (!empleados) return [];
    return Array.from(new Set(empleados.map(e => e.puesto.area).filter(Boolean))).sort();
  }, [empleados]);

  const empleadosElegibles = useMemo<EmpleadoPromocion[]>(() => {
    if (isLoading || !empleados || !perfiles || !historiales || !promociones) return [];
    
    const historialesMap = new Map(historiales.map(h => [h.id_empleado, new Set(h.cursos.filter(c => c.calificacion >= 70).map(c => c.id_curso))]));
    const promocionesMap = new Map(promociones.map(p => [p.id, p]));

    return empleados.map(emp => {
        const perfil = perfiles.find(p => p.nombre_puesto === emp.puesto.titulo);
        let coberturaCursos = 0;
        if (perfil) {
            const cursosCompletadosIds = historialesMap.get(emp.id_empleado) || new Set();
            const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
            const completados = Array.from(cursosCompletadosIds).filter(id => cursosObligatoriosIds.has(id));
            coberturaCursos = cursosObligatoriosIds.size > 0 ? (completados.length / cursosObligatoriosIds.size) * 100 : 100;
        }
        return { ...emp, coberturaCursos, promocionData: promocionesMap.get(emp.id_empleado) };
    });
  }, [isLoading, empleados, perfiles, historiales, promociones]);

  const filteredEmpleados = useMemo(() => {
    if(!reglasAscenso) return [];
    return empleadosElegibles.filter(emp => {
        if (selectedArea && emp.puesto.area !== selectedArea) return false;
        const searchMatch = emp.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.id_empleado.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'todos' || getStatusInfo(emp, reglasAscenso).status === statusFilter;
        return searchMatch && statusMatch;
    }).sort((a,b) => {
        const deptComparison = (a.puesto.departamento || '').localeCompare(b.puesto.departamento || '');
        if (deptComparison !== 0) return deptComparison;
        return a.nombre_completo.localeCompare(b.nombre_completo);
      });
  }, [empleadosElegibles, searchTerm, statusFilter, reglasAscenso, selectedArea]);

  useEffect(() => {
    if (selectedEmpleado?.promocionData) {
      const data = selectedEmpleado.promocionData;
      setFechaCambio(data.fecha_ultimo_cambio ? parseDate(data.fecha_ultimo_cambio) : undefined);
      setEvalDesempeno(data.evaluacion_desempeno?.toString() || '');
      setExamenTeorico(data.examen_teorico?.toString() || '');
    } else {
      setFechaCambio(undefined);
      setEvalDesempeno('');
      setExamenTeorico('');
    }
  }, [selectedEmpleado]);

  const handleSave = async () => {
    if (!selectedEmpleado || !firestore) return;
    const docRef = doc(firestore, 'Promociones', selectedEmpleado.id_empleado);
    
    const dataToSave: any = { 'metadata.actualizado_el': serverTimestamp() };
    if (fechaCambio) dataToSave.fecha_ultimo_cambio = fechaCambio;
    const evalScore = parseInt(evalDesempeno, 10);
    if (!isNaN(evalScore)) { dataToSave.evaluacion_desempeno = evalScore; } else if (evalDesempeno === '') { dataToSave.evaluacion_desempeno = null; }
    const examenScore = parseInt(examenTeorico, 10);
    if (!isNaN(examenScore)) { dataToSave.examen_teorico = examenScore; } else if (examenTeorico === '') { dataToSave.examen_teorico = null; }
    
    await setDoc(docRef, dataToSave, { merge: true });
    setSelectedEmpleado(null);
  };
  
    const handlePromocion = async () => {
    if (!empleadoAPromover || !reglasAscenso || !firestore) return;
    setIsSubmitting(true);

    const regla = reglasAscenso.find(r => r.puesto_actual === empleadoAPromover.puesto.titulo);
    if (!regla) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró una regla de ascenso para este puesto.' });
      setIsSubmitting(false);
      return;
    }

    const { puesto_siguiente } = regla;
    const empleadoId = empleadoAPromover.id_empleado;

    const plantillaDocRef = doc(firestore, 'Plantilla', empleadoId);
    const promocionDocRef = doc(firestore, 'Promociones', empleadoId);

    try {
      await setDoc(plantillaDocRef, { puesto: { ...empleadoAPromover.puesto, titulo: puesto_siguiente } }, { merge: true });
      await setDoc(promocionDocRef, {
        puesto_actual: puesto_siguiente,
        fecha_ultimo_cambio: serverTimestamp(),
        evaluacion_desempeno: null,
        examen_teorico: null,
        'metadata.actualizado_el': serverTimestamp(),
      }, { merge: true });

      toast({
        title: "¡Promoción Exitosa!",
        description: `${empleadoAPromover.nombre_completo} ha sido promovido a ${puesto_siguiente}.`,
        className: "bg-green-100 text-green-800 border-green-300",
      });

    } catch (error) {
      console.error("Error en la promoción:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al procesar la promoción.' });
    } finally {
      setIsSubmitting(false);
      setEmpleadoAPromover(null);
    }
  };

  const handleToggleNoApto = async () => {
    if (!empleadoNoApto || !firestore) return;
    setIsSubmitting(true);
    
    const docRef = doc(firestore, 'Promociones', empleadoNoApto.id_empleado);
    const nuevoEstado = !(empleadoNoApto.promocionData?.no_apto || false);

    try {
        await setDoc(docRef, {
            no_apto: nuevoEstado,
            'metadata.actualizado_el': serverTimestamp()
        }, { merge: true });
        
        toast({
            title: 'Estado Actualizado',
            description: `${empleadoNoApto.nombre_completo} ha sido marcado como ${nuevoEstado ? 'No Apto' : 'Apto'} para promoción.`,
        });

    } catch (error) {
        console.error("Error al actualizar estado 'No Apto':", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado del empleado.' });
    } finally {
        setIsSubmitting(false);
        setEmpleadoNoApto(null);
    }
  }

  const getPuestoSiguiente = (puestoActual: string) => {
    const regla = reglasAscenso?.find(r => r.puesto_actual === puestoActual);
    return regla ? regla.puesto_siguiente : 'N/A';
  };
  
  const getCriterioStatus = (empleado: EmpleadoPromocion, regla: ReglaAscenso, criterio: 'desempeno' | 'teorico') => {
      if (criterio === 'desempeno') {
          const evalScore = empleado.promocionData?.evaluacion_desempeno;
          if (evalScore === undefined || evalScore === null) return { Icon: MinusCircle, color: 'text-gray-400', tooltip: 'Evaluación de desempeño pendiente.' };
          if (evalScore >= regla.min_evaluacion_desempeno) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Desempeño OK (${evalScore} >= ${regla.min_evaluacion_desempeno})` };
          return { Icon: XCircle, color: 'text-red-500', tooltip: `Desempeño bajo (${evalScore} < ${regla.min_evaluacion_desempeno})` };
      }
      if (criterio === 'teorico') {
          if (regla.min_examen_teorico === undefined || regla.min_examen_teorico === null || regla.min_examen_teorico === 0) return { Icon: MinusCircle, color: 'text-gray-400', tooltip: 'No aplica examen teórico.' };
          const examenScore = empleado.promocionData?.examen_teorico;
          if (examenScore === undefined || examenScore === null) return { Icon: MinusCircle, color: 'text-gray-400', tooltip: 'Examen teórico pendiente.' };
          if (examenScore >= regla.min_examen_teorico) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Examen OK (${examenScore} >= ${regla.min_examen_teorico})` };
          return { Icon: XCircle, color: 'text-red-500', tooltip: `Examen reprobado (${examenScore} < ${regla.min_examen_teorico})` };
      }
      return { Icon: MinusCircle, color: 'text-gray-400', tooltip: 'Criterio no definido.' };
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="w-full lg:max-w-xs lg:w-1/4 h-full">
        <Card className="flex flex-col h-full">
            <CardHeader className="p-6 border-b">
            <CardTitle className="flex items-center gap-3 text-xl"><Briefcase className="h-5 w-5 text-primary" /> Áreas de Trabajo</CardTitle>
            <CardDescription>{areasUnicas.length} áreas encontradas</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-2 overflow-hidden">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-1 p-2">
                    <Button variant={!selectedArea ? 'secondary' : 'ghost'} className="justify-start text-left" onClick={() => setSelectedArea(null)}>Todas las áreas</Button>
                {areasUnicas.map(area => (
                    <Button key={area} variant={selectedArea === area ? 'secondary' : 'ghost'} className="justify-start text-left h-auto py-2" onClick={() => setSelectedArea(area)}>
                        <span className="flex-1">{area}</span>
                        {selectedArea === area && <ChevronRight className="h-4 w-4 opacity-50 ml-2 shrink-0" />}
                    </Button>
                ))}
                </div>
            </ScrollArea>
            </CardContent>
        </Card>
      </motion.div>

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card>
            <CardHeader>
            <CardTitle>Gestión de Promoción por Categorías</CardTitle>
            <CardDescription>Visualiza y actualiza el estado de los empleados en el área seleccionada.</CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por ID o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-full sm:w-[240px] rounded-full"><SelectValue placeholder="Filtrar por estatus..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos los estatus</SelectItem>
                    <SelectItem value="Elegible">Elegible</SelectItem>
                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                    <SelectItem value="Requiere Atención">Requiere Atención</SelectItem>
                    <SelectItem value="Máxima Categoría">Máxima Categoría</SelectItem>
                    <SelectItem value="No Apto">No Apto</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
                </Select>
            </div>
            </CardHeader>
            <CardContent>
            <div className="rounded-lg border">
                <TooltipProvider delayDuration={0}>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead>Criterios</TableHead>
                    <TableHead>Cursos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading || !reglasAscenso ? (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">Cargando...</TableCell></TableRow>
                    ) : filteredEmpleados.map(emp => {
                    const statusInfo = getStatusInfo(emp, reglasAscenso);
                    const puedePromover = statusInfo.status !== 'Máxima Categoría' && statusInfo.status !== 'Pendiente' && statusInfo.status !== 'No Apto';
                    const regla = reglasAscenso.find(r => r.puesto_actual === emp.puesto.titulo);
                    const desempeñoStatus = regla ? getCriterioStatus(emp, regla, 'desempeno') : null;
                    const teoricoStatus = regla ? getCriterioStatus(emp, regla, 'teorico') : null;

                    return(
                    <motion.tr key={emp.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.01, zIndex: 10}} className="hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">
                            <div className="text-sm font-semibold">{emp.nombre_completo}</div>
                            <div className="text-xs text-muted-foreground">ID: {emp.id_empleado}</div>
                            <div className="text-xs text-muted-foreground">Puesto: {emp.puesto.titulo}</div>
                            <div className="text-xs text-muted-foreground">Ingreso: {formatDate(emp.fecha_ingreso)}</div>
                        </TableCell>
                        <TableCell>
                        <Tooltip><TooltipTrigger asChild><Badge className={cn('text-white', statusInfo.color)}>{statusInfo.status}</Badge></TooltipTrigger><TooltipContent><p>{statusInfo.message}</p></TooltipContent></Tooltip>
                        </TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            {desempeñoStatus && (<Tooltip><TooltipTrigger><desempeñoStatus.Icon className={cn('h-5 w-5', desempeñoStatus.color)} /></TooltipTrigger><TooltipContent>{desempeñoStatus.tooltip}</TooltipContent></Tooltip>)}
                            {teoricoStatus && ( <Tooltip><TooltipTrigger><teoricoStatus.Icon className={cn('h-5 w-5', teoricoStatus.color)} /></TooltipTrigger><TooltipContent>{teoricoStatus.tooltip}</TooltipContent></Tooltip> )}
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Progress value={emp.coberturaCursos} className="w-20 h-2" />
                                <span className="text-xs font-semibold">{emp.coberturaCursos.toFixed(0)}%</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setSelectedEmpleado(emp)}><ClipboardEdit className="h-4 w-4 mr-2" /> Evaluar</Button>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setEmpleadoNoApto(emp)}>
                                        <UserX className={cn("h-4 w-4", emp.promocionData?.no_apto ? "text-red-500" : "text-gray-400")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{emp.promocionData?.no_apto ? 'Marcar como Apto' : 'Marcar como No Apto'}</p></TooltipContent>
                            </Tooltip>
                            {puedePromover && (
                            <Button variant="default" size="sm" className="ml-2 bg-green-600 hover:bg-green-700" onClick={() => setEmpleadoAPromover(emp)}>
                                <Award className="h-4 w-4 mr-2" /> Promover
                            </Button>
                            )}
                        </TableCell>
                    </motion.tr>
                    )})}
                </TableBody>
                </Table>
                </TooltipProvider>
            </div>
            </CardContent>
        </Card>
      </motion.div>
      
      {selectedEmpleado && (
        <Dialog open={!!selectedEmpleado} onOpenChange={() => setSelectedEmpleado(null)}>
            <DialogContent className="rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Evaluar a: {selectedEmpleado.nombre_completo}</DialogTitle>
                    <DialogDescription>Puesto: {selectedEmpleado.puesto.titulo}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="eval_desempeno" className="flex items-center gap-2"><UserCheck/> Eval. Desempeño</Label><Input id="eval_desempeno" type="number" placeholder="0-100" value={evalDesempeno} onChange={e => setEvalDesempeno(e.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="examen_teorico" className="flex items-center gap-2"><BookOpen/> Examen Teórico</Label><Input id="examen_teorico" type="number" placeholder="0-100" value={examenTeorico} onChange={e => setExamenTeorico(e.target.value)} /></div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="fecha_cambio" className="flex items-center gap-2"><CalendarIcon/> Fecha de Último Cambio</Label>
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !fechaCambio && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{fechaCambio ? format(fechaCambio, "PPP", { locale: es }) : <span>Selecciona fecha</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaCambio} onSelect={setFechaCambio} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Percent/> Cobertura de Cursos</Label>
                        <div className="flex items-center gap-2"><Progress value={selectedEmpleado.coberturaCursos} className="h-3" /><span className="font-bold text-sm">{selectedEmpleado.coberturaCursos.toFixed(0)}%</span></div>
                     </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setSelectedEmpleado(null)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!empleadoAPromover} onOpenChange={() => setEmpleadoAPromover(null)}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Promoción</AlertDialogTitle>
                <AlertDialogDescription>
                    ¿Estás seguro de que quieres promover a 
                    <strong className="text-foreground"> {empleadoAPromover?.nombre_completo}</strong>?
                    <div className="flex items-center justify-center gap-4 my-4 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Puesto Actual</p>
                            <Badge variant="secondary">{empleadoAPromover?.puesto.titulo}</Badge>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Puesto Nuevo</p>
                            <Badge className="bg-green-600 text-white">{empleadoAPromover ? getPuestoSiguiente(empleadoAPromover.puesto.titulo) : '...'}</Badge>
                        </div>
                    </div>
                     Esta acción actualizará su puesto en la plantilla y reiniciará su ciclo de promoción. No se puede deshacer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handlePromocion} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar y Promover
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!empleadoNoApto} onOpenChange={() => setEmpleadoNoApto(null)}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Cambio de Estado</AlertDialogTitle>
                <AlertDialogDescription>
                    Estás a punto de cambiar el estado de elegibilidad de 
                    <strong className="text-foreground"> {empleadoNoApto?.nombre_completo}</strong>.
                    <p className='mt-2'>
                        {empleadoNoApto?.promocionData?.no_apto 
                            ? 'Esto lo volverá a hacer elegible para futuras promociones, si cumple los demás criterios.'
                            : 'Esto lo marcará como "No Apto" para promoción, independientemente de sus métricas.'
                        }
                    </p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleNoApto} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
