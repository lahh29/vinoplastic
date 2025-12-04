
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, limit, doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Briefcase, BookOpen, CheckCircle2, Clock, Award, Target, CalendarDays, Sparkles, BookUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, differenceInMonths, isValid, intervalToDuration } from 'date-fns';
import { es } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
const statusColors: Record<EstatusPromocion, string> = { 'Elegible': 'bg-green-500 text-white', 'En Progreso': 'bg-blue-500 text-white', 'Máxima Categoría': 'bg-purple-500 text-white', 'Requiere Atención': 'bg-orange-500 text-white', 'Pendiente': 'bg-gray-400 text-white', 'No Apto': 'bg-zinc-600 text-white' };

export default function PortalPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [empleadoPerfil, setEmpleadoPerfil] = useState<EmpleadoPerfil | null>(null);

  // Consulta para obtener el 'id_empleado' basado en el UID del usuario.
  const usuarioInfoRef = useMemoFirebase(() => user ? doc(firestore, 'usuarios', user.uid) : null, [user, firestore]);
  const { data: usuarioData } = useDoc<{ id_empleado?: string }>(usuarioInfoRef);
  
  // Consulta para obtener los datos del empleado de la 'Plantilla'
  const empleadoQuery = useMemoFirebase(
    () => usuarioData?.id_empleado ? query(collection(firestore, 'Plantilla'), where('id_empleado', '==', usuarioData.id_empleado), limit(1)) : null,
    [firestore, usuarioData]
  );
  const { data: empleadosData, isLoading: loadingEmpleado } = useCollection<Empleado>(empleadoQuery);
  const empleado = useMemo(() => (empleadosData && empleadosData.length > 0) ? empleadosData[0] : null, [empleadosData]);
  
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const promocionesRef = useMemoFirebase(() => collection(firestore, 'Promociones'), [firestore]);
  const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
  const { data: promociones, isLoading: l4 } = useCollection<Promocion>(promocionesRef);
  const { data: reglasAscenso, isLoading: l5 } = useCollection<ReglaAscenso>(reglasAscensoRef);
  const { data: catalogoCursos, isLoading: l6 } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const isLoading = isUserLoading || loadingEmpleado || l2 || l3 || l4 || l5 || l6;

  useEffect(() => {
    if (isLoading || !empleado || !perfiles || !historiales || !promociones || !catalogoCursos) {
        return;
    }
    
    const perfil = perfiles.find(p => p.nombre_puesto === empleado.puesto.titulo);
    const historial = historiales.find(h => h.id_empleado === empleado.id_empleado);
    const promocionData = promociones.find(p => p.id === empleado.id_empleado);
    const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c]));
    
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
        }).sort((a,b) => a.curso.nombre_oficial.localeCompare(b.curso.nombre_oficial));
        
        const aprobados = cursosConEstado.filter(c => c.estado === 'Aprobado').length;
        coberturaCursos = perfil.cursos_obligatorios.length > 0 ? (aprobados / perfil.cursos_obligatorios.length) * 100 : 100;
    }
    
    setEmpleadoPerfil({ ...empleado, promocionData, coberturaCursos, cursosConEstado });
    
  }, [isLoading, empleado, perfiles, historiales, promociones, catalogoCursos]);
  
  const antiguedad = useMemo(() => {
    if (!empleadoPerfil?.fecha_ingreso) return null;
    const fechaIngreso = parseDate(empleadoPerfil.fecha_ingreso);
    if (!fechaIngreso) return null;
    
    const duracion = intervalToDuration({ start: fechaIngreso, end: new Date() });
    
    const parts = [];
    if (duracion.years && duracion.years > 0) parts.push(`${duracion.years} años`);
    if (duracion.months && duracion.months > 0) parts.push(`${duracion.months} meses`);
    if (duracion.days && duracion.days > 0) parts.push(`${duracion.days} días`);
    if(parts.length === 0) return "Menos de un día";

    return parts.join(', ');
  }, [empleadoPerfil]);
  
  const reglaAplicable = reglasAscenso?.find(r => r.puesto_actual === empleadoPerfil?.puesto.titulo);
  const statusInfo = empleadoPerfil ? getStatusInfo(empleadoPerfil, reglaAplicable) : null;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!empleadoPerfil) {
    return <div className="flex h-full items-center justify-center"><p className="text-lg text-muted-foreground">No se encontró un perfil de empleado asociado a tu cuenta.</p></div>;
  }

  const cursosPendientes = empleadoPerfil.cursosConEstado.filter(c => c.estado === 'Pendiente');
  const cursosCompletados = empleadoPerfil.cursosConEstado.filter(c => c.estado !== 'Pendiente');

  return (
    <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} transition={{ duration: 0.5 }} className="space-y-8">
      <h1 className="text-4xl font-bold tracking-tight">Bienvenido a tu Portal, {empleadoPerfil.nombre_completo.split(' ')[0]}</h1>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3"><User/>Información General</CardTitle>
              <CardDescription>Tu perfil y puesto actual</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">ID: {empleadoPerfil.id_empleado}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <p><span className="font-semibold text-muted-foreground">Puesto:</span> {empleadoPerfil.puesto.titulo}</p>
          <p><span className="font-semibold text-muted-foreground">Departamento:</span> {empleadoPerfil.puesto.departamento}</p>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarDays/>Antigüedad</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{antiguedad || 'N/A'}</p></CardContent></Card>
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Target/>Plan de Carrera</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{statusInfo?.status}</p>
                    <div className={cn("p-2 rounded-full", statusColors[statusInfo?.status || 'Pendiente'])}><Sparkles className="h-5 w-5 text-white" /></div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{statusInfo?.message}</p>
            </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen/>Capacitación</CardTitle></CardHeader>
            <CardContent>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-muted-foreground">Progreso de Cursos</span>
                    <span className="text-sm font-bold">{empleadoPerfil.coberturaCursos.toFixed(0)}%</span>
                </div>
                <Progress value={empleadoPerfil.coberturaCursos} />
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle className="text-xl flex items-center gap-3"><Clock className="text-red-500" />Cursos Pendientes</CardTitle></CardHeader>
          <CardContent>
            {cursosPendientes.length > 0 ? (
                <div className="space-y-3">
                    {cursosPendientes.map(({curso}) => (
                        <div key={curso.id} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                            <span className="font-medium text-sm">{curso.nombre_oficial}</span>
                            <Button size="sm" variant="outline"><BookUp className="mr-2 h-4 w-4"/> Ver Material</Button>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-muted-foreground py-10">¡Felicidades! No tienes cursos pendientes.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xl flex items-center gap-3"><CheckCircle2 className="text-green-500" />Historial de Cursos</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-72">
                <Table>
                    <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead className="text-right">Calificación</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {cursosCompletados.length > 0 ? cursosCompletados.map(({curso, calificacion}) => (
                            <TableRow key={curso.id}><TableCell className="font-medium">{curso.nombre_oficial}</TableCell><TableCell className="text-right font-mono">{calificacion}</TableCell></TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No has completado cursos.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
