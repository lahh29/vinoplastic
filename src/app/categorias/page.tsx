
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserCheck, ShieldCheck, ClipboardEdit, Calendar as CalendarIcon, Percent, BookOpen, Clock, Award, AlertCircle, Users, Briefcase, ChevronRight, ArrowRight, Loader2, CheckCircle2, XCircle, MinusCircle, UserX, UserRound, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { useRoleCheck } from '@/hooks/use-role-check';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }
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
  cursosCompletados: CursoCatalogo[];
  cursosPendientes: CursoCatalogo[];
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

type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente' | 'No Apto';

const getStatusInfo = (empleado: EmpleadoPromocion, reglasAscenso: ReglaAscenso[]): { status: EstatusPromocion, message: string, color: string, textColor: string } => {
    if (empleado.promocionData?.no_apto) return { status: 'No Apto', message: 'Marcado manualmente como no apto para promoción.', color: 'bg-zinc-500/10 border-zinc-500/30', textColor: 'text-zinc-400' };
    const puestoActual = empleado.puesto.titulo;
    const regla = reglasAscenso.find(r => r.puesto_actual === puestoActual);
    
    if (!regla) {
        return { status: 'Pendiente', message: 'Este puesto no forma parte de un plan de carrera o es la categoría inicial.', color: 'bg-gray-400/10 border-gray-400/30', textColor: 'text-gray-400' };
    }

    const { meses_minimos, min_cobertura_matriz, min_evaluacion_desempeno, min_examen_teorico } = regla;
    const fechaCambio = empleado.promocionData?.fecha_ultimo_cambio ? parseDate(empleado.promocionData.fecha_ultimo_cambio) : parseDate(empleado.fecha_ingreso);
    if (!fechaCambio) return { status: 'Pendiente', message: 'Se necesita registrar la fecha del último cambio o de ingreso para evaluar.', color: 'bg-gray-400/10 border-gray-400/30', textColor: 'text-gray-400' };
    
    const mesesDesdeCambio = differenceInMonths(new Date(), fechaCambio);

    if (mesesDesdeCambio < meses_minimos) return { status: 'En Progreso', message: `En período de espera. Necesita ${meses_minimos} meses, actualmente tiene ${mesesDesdeCambio}.`, color: 'bg-blue-500/10 border-blue-500/30', textColor: 'text-blue-400' };
    
    const evaluacionDesempeno = empleado.promocionData?.evaluacion_desempeno;
    if (evaluacionDesempeno === undefined || evaluacionDesempeno === null || evaluacionDesempeno < min_evaluacion_desempeno) return { status: 'Requiere Atención', message: `Evaluación de desempeño pendiente o inferior a ${min_evaluacion_desempeno} (actual: ${evaluacionDesempeno ?? 'N/A'}).`, color: 'bg-orange-500/10 border-orange-500/30', textColor: 'text-orange-400' };

    const examenTeorico = empleado.promocionData?.examen_teorico;
    if (min_examen_teorico !== undefined && min_examen_teorico > 0) {
        if(examenTeorico === undefined || examenTeorico === null || examenTeorico < min_examen_teorico) return { status: 'Requiere Atención', message: `Examen teórico pendiente o inferior a ${min_examen_teorico}. Calificación actual: ${examenTeorico ?? 'N/A'}.`, color: 'bg-orange-500/10 border-orange-500/30', textColor: 'text-orange-400' };
    }
    
    if (empleado.coberturaCursos < min_cobertura_matriz) return { status: 'Requiere Atención', message: `Tiempo de espera cumplido, pero requiere ${min_cobertura_matriz}% de cursos y tiene ${empleado.coberturaCursos.toFixed(0)}%.`, color: 'bg-orange-500/10 border-orange-500/30', textColor: 'text-orange-400' };
    
    return { status: 'Elegible', message: `Cumple con el tiempo, cursos y evaluación. ¡Listo para ser evaluado!`, color: 'bg-green-600/10 border-green-600/30', textColor: 'text-green-500' };
};

const getCriterioStatus = (empleado: EmpleadoPromocion, regla: ReglaAscenso, criterio: 'tiempo' | 'desempeno' | 'teorico' | 'cursos') => {
    const fechaCambio = empleado.promocionData?.fecha_ultimo_cambio ? parseDate(empleado.promocionData.fecha_ultimo_cambio) : parseDate(empleado.fecha_ingreso);
    if (criterio === 'tiempo') {
        if (!fechaCambio) return { Icon: MinusCircle, color: 'text-muted-foreground', tooltip: 'Fecha de ingreso/cambio no disponible.'};
        const mesesDesdeCambio = differenceInMonths(new Date(), fechaCambio);
        if (mesesDesdeCambio >= regla.meses_minimos) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Permanencia OK (${mesesDesdeCambio} de ${regla.meses_minimos} meses)` };
        return { Icon: XCircle, color: 'text-red-500', tooltip: `Permanencia insuficiente (${mesesDesdeCambio} de ${regla.meses_minimos} meses)` };
    }
    if (criterio === 'desempeno') {
        const evalScore = empleado.promocionData?.evaluacion_desempeno;
        if (evalScore === undefined || evalScore === null) return { Icon: MinusCircle, color: 'text-muted-foreground', tooltip: 'Evaluación pendiente.' };
        if (evalScore >= regla.min_evaluacion_desempeno) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Desempeño OK (${evalScore} >= ${regla.min_evaluacion_desempeno})` };
        return { Icon: XCircle, color: 'text-red-500', tooltip: `Desempeño bajo (${evalScore} < ${regla.min_evaluacion_desempeno})` };
    }
    if (criterio === 'teorico') {
        if (!regla.min_examen_teorico || regla.min_examen_teorico === 0) return { Icon: MinusCircle, color: 'text-muted-foreground', tooltip: 'No aplica examen teórico.' };
        const examenScore = empleado.promocionData?.examen_teorico;
        if (examenScore === undefined || examenScore === null) return { Icon: MinusCircle, color: 'text-muted-foreground', tooltip: 'Examen pendiente.' };
        if (examenScore >= regla.min_examen_teorico) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Examen OK (${examenScore} >= ${regla.min_examen_teorico})` };
        return { Icon: XCircle, color: 'text-red-500', tooltip: `Examen reprobado (${examenScore} < ${regla.min_examen_teorico})` };
    }
    if (criterio === 'cursos') {
        if (empleado.coberturaCursos >= regla.min_cobertura_matriz) return { Icon: CheckCircle2, color: 'text-green-500', tooltip: `Cursos OK (${empleado.coberturaCursos.toFixed(0)}% >= ${regla.min_cobertura_matriz}%)` };
        return { Icon: XCircle, color: 'text-red-500', tooltip: `Cursos insuficientes (${empleado.coberturaCursos.toFixed(0)}% < ${regla.min_cobertura_matriz}%)` };
    }
    return { Icon: MinusCircle, color: 'text-muted-foreground', tooltip: 'Criterio no definido.' };
}


export default function PromocionesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, checkAdminAndExecute } = useRoleCheck();
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

  const areasAgrupadas = useMemo(() => {
    if (!empleados) return {};
    const groups: Record<string, Set<string>> = {};
    empleados.forEach(emp => {
        const dept = emp.puesto.departamento || 'SIN DEPARTAMENTO';
        const area = emp.puesto.area || 'SIN ÁREA';
        if (!groups[dept]) {
            groups[dept] = new Set();
        }
        groups[dept].add(area);
    });
    // Sort areas within each department
    for (const dept in groups) {
        groups[dept] = new Set(Array.from(groups[dept]).sort());
    }
    return groups;
  }, [empleados]);

  const empleadosElegibles = useMemo<EmpleadoPromocion[]>(() => {
    if (isLoading || !empleados || !perfiles || !historiales || !promociones || !catalogoCursos) return [];
    
    const historialesMap = new Map(historiales.map(h => [h.id_empleado, new Set(h.cursos.filter(c => c.calificacion >= 70).map(c => c.id_curso))]));
    const promocionesMap = new Map(promociones.map(p => [p.id, p]));
    const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c]));

    return empleados.map(emp => {
        const perfil = perfiles.find(p => p.nombre_puesto === emp.puesto.titulo);
        let coberturaCursos = 0;
        let cursosCompletados: CursoCatalogo[] = [];
        let cursosPendientes: CursoCatalogo[] = [];

        if (perfil) {
            const cursosCompletadosIds = historialesMap.get(emp.id_empleado) || new Set();
            const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
            
            const completadosIds = Array.from(cursosCompletadosIds).filter(id => cursosObligatoriosIds.has(id));
            cursosCompletados = completadosIds.map(id => catalogoMap.get(id)!).filter(Boolean);

            const pendientesIds = perfil.cursos_obligatorios.filter(id => !cursosCompletadosIds.has(id));
            cursosPendientes = pendientesIds.map(id => catalogoMap.get(id)!).filter(Boolean);

            coberturaCursos = cursosObligatoriosIds.size > 0 ? (completadosIds.length / cursosObligatoriosIds.size) * 100 : 100;
        }
        const promocionData = promocionesMap.get(emp.id_empleado);
        return { ...emp, coberturaCursos, promocionData, cursosCompletados, cursosPendientes };
    });
  }, [isLoading, empleados, perfiles, historiales, promociones, catalogoCursos]);

  const filteredEmpleados = useMemo(() => {
    if(!reglasAscenso) return [];
    return empleadosElegibles.filter(emp => {
        if (selectedArea && emp.puesto.area !== selectedArea) return false;
        const searchMatch = emp.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.id_empleado.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'todos' || getStatusInfo(emp, reglasAscenso).status === statusFilter;
        return searchMatch && statusMatch;
    }).sort((a,b) => a.puesto.departamento.localeCompare(b.puesto.departamento) || a.nombre_completo.localeCompare(b.nombre_completo));
  }, [empleadosElegibles, searchTerm, statusFilter, reglasAscenso, selectedArea]);

  useEffect(() => {
    if (selectedEmpleado?.promocionData) {
      const data = selectedEmpleado.promocionData;
      setFechaCambio(data.fecha_ultimo_cambio ? parseDate(data.fecha_ultimo_cambio) : undefined);
      setEvalDesempeno(data.evaluacion_desempeno?.toString() || '');
      setExamenTeorico(data.examen_teorico?.toString() || '');
    } else if (selectedEmpleado) { // Si hay empleado pero no promocionData
      setFechaCambio(selectedEmpleado.fecha_ingreso ? parseDate(selectedEmpleado.fecha_ingreso) : undefined);
      setEvalDesempeno('');
      setExamenTeorico('');
    }
  }, [selectedEmpleado]);

  const handleSave = () => {
    checkAdminAndExecute(async () => {
      if (!selectedEmpleado || !firestore) return;
      setIsSubmitting(true);
      const docRef = doc(firestore, 'Promociones', selectedEmpleado.id_empleado);
      
      const dataToSave: any = { 'metadata.actualizado_el': serverTimestamp() };
      if (fechaCambio) dataToSave.fecha_ultimo_cambio = fechaCambio;
      const evalScore = parseInt(evalDesempeno, 10);
      dataToSave.evaluacion_desempeno = !isNaN(evalScore) ? evalScore : null;
      const examenScore = parseInt(examenTeorico, 10);
      dataToSave.examen_teorico = !isNaN(examenScore) ? examenScore : null;
      
      await setDoc(docRef, dataToSave, { merge: true });
      setIsSubmitting(false);
      setSelectedEmpleado(null);
      toast({ title: 'Éxito', description: 'Se han guardado las evaluaciones.' });
    });
  };
  
    const handlePromocion = () => {
      checkAdminAndExecute(async () => {
        if (!empleadoAPromover || !reglasAscenso || !firestore) return;
        setIsSubmitting(true);
        const regla = reglasAscenso.find(r => r.puesto_actual === empleadoAPromover.puesto.titulo);
        if (!regla) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se encontró una regla de ascenso.' });
          setIsSubmitting(false);
          return;
        }
        const { puesto_siguiente } = regla;
        await setDoc(doc(firestore, 'Plantilla', empleadoAPromover.id_empleado), { puesto: { ...empleadoAPromover.puesto, titulo: puesto_siguiente } }, { merge: true });
        await setDoc(doc(firestore, 'Promociones', empleadoAPromover.id_empleado), {
            puesto_actual: puesto_siguiente,
            fecha_ultimo_cambio: serverTimestamp(),
            evaluacion_desempeno: null,
            examen_teorico: null,
            no_apto: false,
            'metadata.actualizado_el': serverTimestamp(),
        }, { merge: true });
        toast({ title: "¡Promoción Exitosa!", description: `${empleadoAPromover.nombre_completo} ha sido promovido a ${puesto_siguiente}.`, className: "bg-green-100 text-green-800 border-green-300" });
        setIsSubmitting(false);
        setEmpleadoAPromover(null);
        setSelectedEmpleado(null);
      });
  };

  const handleToggleNoApto = () => {
    checkAdminAndExecute(async () => {
      if (!empleadoNoApto || !firestore) return;
      setIsSubmitting(true);
      const docRef = doc(firestore, 'Promociones', empleadoNoApto.id_empleado);
      const nuevoEstado = !(empleadoNoApto.promocionData?.no_apto || false);
      await setDoc(docRef, { no_apto: nuevoEstado, 'metadata.actualizado_el': serverTimestamp() }, { merge: true });
      toast({ title: 'Estado Actualizado', description: `${empleadoNoApto.nombre_completo} fue marcado como ${nuevoEstado ? 'No Apto' : 'Apto'}.` });
      setIsSubmitting(false);
      setEmpleadoNoApto(null);
      setSelectedEmpleado(null);
    });
  }

  const getPuestoSiguiente = (puestoActual: string) => {
    const regla = reglasAscenso?.find(r => r.puesto_actual === puestoActual);
    return regla ? regla.puesto_siguiente : 'N/A';
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="w-full lg:max-w-xs lg:w-1/4 h-full">
        <Card className="flex flex-col h-full rounded-2xl shadow-lg border-border/50">
            <CardHeader className="p-6 border-b"><CardTitle className="flex items-center gap-3 text-xl"><Briefcase className="h-5 w-5 text-primary" /> Áreas de Trabajo</CardTitle><CardDescription>Filtra por departamento y área.</CardDescription></CardHeader>
            <CardContent className="flex-1 p-2 overflow-hidden">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-1 p-2">
                    <Button variant={!selectedArea ? 'secondary' : 'ghost'} className="justify-start text-left" onClick={() => setSelectedArea(null)}>Todas las áreas</Button>
                    <Accordion type="multiple" className="w-full">
                      {Object.keys(areasAgrupadas).sort().map(dept => (
                        <AccordionItem value={dept} key={dept} className="border-b-0">
                           <AccordionTrigger className="py-2 px-2 text-sm font-semibold hover:no-underline rounded-md hover:bg-muted">
                                {dept}
                            </AccordionTrigger>
                            <AccordionContent className="pb-1 pl-4">
                               <div className="flex flex-col items-start mt-1 space-y-1">
                                    {Array.from(areasAgrupadas[dept]).map(area => (
                                        <Button
                                            key={area}
                                            variant={selectedArea === area ? 'secondary' : 'ghost'}
                                            className="w-full h-auto justify-start text-left text-xs py-1.5"
                                            onClick={() => setSelectedArea(area)}
                                        >
                                            {area}
                                        </Button>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                </div>
            </ScrollArea>
            </CardContent>
        </Card>
      </motion.div>

      <motion.div className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card className="rounded-2xl shadow-lg border-border/50">
            <CardHeader><CardTitle>Expediente de Talento</CardTitle><CardDescription>Visualiza y gestiona el progreso de promoción del personal.</CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por ID o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" /></div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}><SelectTrigger className="w-full sm:w-[240px] rounded-full"><SelectValue placeholder="Filtrar por estatus..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos los estatus</SelectItem>
                    <SelectItem value="Elegible">Elegible</SelectItem><SelectItem value="En Progreso">En Progreso</SelectItem>
                    <SelectItem value="Requiere Atención">Requiere Atención</SelectItem><SelectItem value="Máxima Categoría">Máxima Categoría</SelectItem>
                    <SelectItem value="No Apto">No Apto</SelectItem><SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
                </Select>
            </div>
            </CardHeader>
            <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-20rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-6">
                    {isLoading || !reglasAscenso ? (
                        Array.from({length: 8}).map((_, i) => <Card key={i} className="p-4 space-y-3 animate-pulse"><div className="h-6 w-3/4 rounded bg-muted"></div><div className="h-4 w-1/2 rounded bg-muted"></div><div className="h-8 w-full rounded bg-muted"></div></Card>)
                    ) : filteredEmpleados.map(emp => {
                    const statusInfo = getStatusInfo(emp, reglasAscenso);
                    return(
                    <motion.div layout key={emp.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="h-full">
                        <Card className="group flex flex-col h-full hover:shadow-xl transition-all duration-200 cursor-pointer border hover:border-primary overflow-hidden" onClick={() => setSelectedEmpleado(emp)}>
                            <CardHeader className="p-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <Badge className={cn('text-xs font-semibold border', statusInfo.color, statusInfo.textColor)}>{statusInfo.status}</Badge>
                                    <span className="text-xs font-mono text-muted-foreground">{emp.id_empleado}</span>
                                </div>
                                <div className="mt-3">
                                    <p className="font-bold text-lg leading-tight truncate">{emp.nombre_completo}</p>
                                    <p className="text-sm text-muted-foreground truncate">{emp.puesto.titulo}</p>
                                </div>
                            </CardHeader>
                            <CardFooter className="p-4 bg-secondary/30">
                                <div className="w-full">
                                    <Label className="text-xs text-muted-foreground">Cobertura de Cursos</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Progress value={emp.coberturaCursos} className="h-1.5" />
                                        <span className="text-xs font-bold text-foreground">{emp.coberturaCursos.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                    )})}
                </div>
            </ScrollArea>
            </CardContent>
        </Card>
      </motion.div>
      
      {selectedEmpleado && (
        <Sheet open={!!selectedEmpleado} onOpenChange={() => setSelectedEmpleado(null)}>
            <SheetContent className="sm:max-w-xl w-full flex flex-col">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-2xl">{selectedEmpleado.nombre_completo}</SheetTitle>
                    <SheetDescription>{selectedEmpleado.puesto.titulo} | {selectedEmpleado.puesto.departamento}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-3"><Sparkles className="h-5 w-5 text-primary"/>Progreso de Promoción</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {(() => {
                                const regla = reglasAscenso?.find(r => r.puesto_actual === selectedEmpleado.puesto.titulo);
                                if (!regla) return <p className="col-span-2 text-sm text-muted-foreground">Este puesto no tiene un plan de carrera definido.</p>;
                                const criterios = [
                                    { label: 'Permanencia', status: getCriterioStatus(selectedEmpleado, regla, 'tiempo') },
                                    { label: 'Cursos', status: getCriterioStatus(selectedEmpleado, regla, 'cursos') },
                                    { label: 'Desempeño', status: getCriterioStatus(selectedEmpleado, regla, 'desempeno') },
                                    { label: 'Ex. Teórico', status: getCriterioStatus(selectedEmpleado, regla, 'teorico') },
                                ];
                                return criterios.map(({label, status}) => (
                                    <TooltipProvider key={label}><Tooltip><TooltipTrigger>
                                        <div className="flex items-center gap-2"><status.Icon className={cn('h-5 w-5', status.color)} /> <span className="text-sm font-medium text-muted-foreground">{label}</span></div>
                                    </TooltipTrigger><TooltipContent>{status.tooltip}</TooltipContent></Tooltip></TooltipProvider>
                                ));
                            })()}
                        </CardContent>
                    </Card>
                    
                    <Accordion type="multiple" className="w-full space-y-4">
                        <AccordionItem value="evaluaciones" className="border rounded-lg">
                            <AccordionTrigger className="px-4 py-3 text-lg font-medium"><div className="flex items-center gap-3"><ClipboardEdit/>Evaluaciones</div></AccordionTrigger>
                            <AccordionContent className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label htmlFor="eval_desempeno">Eval. Desempeño</Label><Input id="eval_desempeno" type="number" placeholder="0-100" value={evalDesempeno} onChange={e => setEvalDesempeno(e.target.value)} disabled={!isAdmin} /></div>
                                    <div className="space-y-2"><Label htmlFor="examen_teorico">Examen Teórico</Label><Input id="examen_teorico" type="number" placeholder="0-100" value={examenTeorico} onChange={e => setExamenTeorico(e.target.value)} disabled={!isAdmin} /></div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fecha_cambio">Fecha de Último Cambio/Ingreso</Label>
                                    <Popover><PopoverTrigger asChild><Button variant="outline" disabled={!isAdmin} className={cn("w-full justify-start text-left font-normal", !fechaCambio && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{fechaCambio ? format(fechaCambio, "PPP", { locale: es }) : <span>Selecciona fecha</span>}</Button></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fechaCambio} onSelect={setFechaCambio} initialFocus /></PopoverContent></Popover>
                                </div>
                                {isAdmin && <div className="flex justify-end"><Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}Guardar Evaluaciones</Button></div>}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="cursos" className="border rounded-lg">
                            <AccordionTrigger className="px-4 py-3 text-lg font-medium"><div className="flex items-center gap-3"><BookOpen/>Matriz de Habilidades</div></AccordionTrigger>
                            <AccordionContent className="p-4 space-y-4 max-h-80 overflow-y-auto">
                                <h4 className="font-semibold text-red-500">Pendientes ({selectedEmpleado.cursosPendientes.length})</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">{selectedEmpleado.cursosPendientes.length > 0 ? selectedEmpleado.cursosPendientes.map(c => <li key={c.id}>{c.nombre_oficial}</li>) : <li className="list-none text-muted-foreground">¡Ninguno!</li>}</ul>
                                <h4 className="font-semibold text-green-500 pt-4">Completados ({selectedEmpleado.cursosCompletados.length})</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">{selectedEmpleado.cursosCompletados.length > 0 ? selectedEmpleado.cursosCompletados.map(c => <li key={c.id}>{c.nombre_oficial}</li>) : <li className="list-none text-muted-foreground">Ninguno aún.</li>}</ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                </ScrollArea>
                {isAdmin && <SheetFooter className="p-6 border-t gap-2">
                     <Button variant="outline" onClick={() => setEmpleadoNoApto(selectedEmpleado)} className={selectedEmpleado.promocionData?.no_apto ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}>
                        {selectedEmpleado.promocionData?.no_apto ? <UserCheck className="h-4 w-4 mr-2"/> : <UserX className="h-4 w-4 mr-2"/>}
                        {selectedEmpleado.promocionData?.no_apto ? "Marcar como Apto" : "Marcar como No Apto"}
                     </Button>
                     <Button onClick={() => setEmpleadoAPromover(selectedEmpleado)} className="bg-green-600 hover:bg-green-700" disabled={getStatusInfo(selectedEmpleado, reglasAscenso || []).status !== 'Elegible'}>
                        <Award className="h-4 w-4 mr-2"/>Promover
                     </Button>
                </SheetFooter>}
            </SheetContent>
        </Sheet>
      )}

      {empleadoAPromover && (<AlertDialog open={!!empleadoAPromover} onOpenChange={() => setEmpleadoAPromover(null)}>
        <AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Confirmar Promoción</AlertDialogTitle>
            <AlertDialogDescription>
                ¿Estás seguro de promover a <strong className="text-foreground">{empleadoAPromover?.nombre_completo}</strong>?
                <div className="flex items-center justify-center gap-4 my-4 text-center">
                    <div><p className="text-xs text-muted-foreground">Puesto Actual</p><Badge variant="secondary">{empleadoAPromover?.puesto.titulo}</Badge></div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">Puesto Nuevo</p><Badge className="bg-green-600 text-white">{empleadoAPromover ? getPuestoSiguiente(empleadoAPromover.puesto.titulo) : '...'}</Badge></div>
                </div>Esta acción es irreversible y actualizará el puesto del empleado.
            </AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handlePromocion} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent></AlertDialog>)}

      {empleadoNoApto && (<AlertDialog open={!!empleadoNoApto} onOpenChange={() => setEmpleadoNoApto(null)}>
        <AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Confirmar Cambio de Estado</AlertDialogTitle>
            <AlertDialogDescription>
                Estás a punto de cambiar el estado de <strong className="text-foreground">{empleadoNoApto?.nombre_completo}</strong> a <strong className="text-foreground">{empleadoNoApto?.promocionData?.no_apto ? "Apto" : "No Apto"}</strong> para futuras promociones.
            </AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleToggleNoApto} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent></AlertDialog>)}
    </div>
  );
}

