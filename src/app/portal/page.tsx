
'use client';

import React, { useMemo } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, User, Briefcase, BookOpen, CheckCircle2, XCircle, Clock, Award, Target, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, differenceInMonths, isValid } from 'date-fns';
import Link from 'next/link';

// --- Interfaces ---
interface UserData { id_empleado?: string; }
interface Empleado { nombre_completo: string; puesto: { titulo: string; departamento: string; }; fecha_ingreso?: { toDate: () => Date }; }
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface HistorialCurso { id_curso: string; calificacion: number; }
interface Historial { id_empleado: string; cursos: HistorialCurso[]; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; url_pdf?: string; }
interface Promocion { id: string; fecha_ultimo_cambio?: { toDate: () => Date }; examen_teorico?: number; evaluacion_desempeno?: number; no_apto?: boolean; }
interface ReglaAscenso { id: string; puesto_actual: string; puesto_siguiente: string; meses_minimos: number; min_evaluacion_desempeno: number; min_examen_teorico?: number; min_cobertura_matriz: number; }

interface CursoConEstado {
    curso: CursoCatalogo;
    estado: 'Aprobado' | 'Reprobado' | 'Pendiente';
    calificacion?: number;
}
interface EmpleadoPerfil extends Empleado {
    promocionData?: Promocion;
    coberturaCursos: number;
    cursosAsignados: CursoConEstado[];
    cursosExtras: CursoConEstado[];
    promedioGeneral: number;
}
type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente' | 'No Apto';

// --- Helpers ---
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

const statusColors: Record<EstatusPromocion, string> = { 'Elegible': 'bg-green-500', 'En Progreso': 'bg-blue-500', 'Máxima Categoría': 'bg-purple-500', 'Requiere Atención': 'bg-orange-500', 'Pendiente': 'bg-gray-400', 'No Apto': 'bg-zinc-600' };

export default function PortalPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userInfoRef = useMemoFirebase(() => (user ? doc(firestore, 'usuarios', user.uid) : null), [user, firestore]);
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserData>(userInfoRef);

  const empleadoRef = useMemoFirebase(() => (userInfo?.id_empleado ? doc(firestore, 'Plantilla', userInfo.id_empleado) : null), [userInfo, firestore]);
  const { data: empleadoData, isLoading: isEmpleadoLoading } = useDoc<Empleado>(empleadoRef);

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
  
  const isLoading = isAuthLoading || isUserInfoLoading || isEmpleadoLoading || l2 || l3 || l4 || l5 || l6;

  const empleadoPerfil = useMemo((): EmpleadoPerfil | null => {
    if (isLoading || !empleadoData) return null;

    const perfil = perfiles?.find(p => p.nombre_puesto === empleadoData.puesto.titulo);
    const historial = historiales?.find(h => h.id_empleado === empleadoData.id_empleado);
    const promocionData = promociones?.find(p => p.id === empleadoData.id_empleado);
    const catalogoMap = new Map(catalogoCursos?.map(c => [c.id_curso, c]));
    
    let cursosAsignados: CursoConEstado[] = [];
    let cursosExtras: CursoConEstado[] = [];
    let coberturaCursos = 0;
    let promedioGeneral = 0;

    const cursosTomadosMap = new Map(historial?.cursos?.map(c => [c.id_curso, c.calificacion]));

    if (perfil?.cursos_obligatorios) {
        cursosAsignados = perfil.cursos_obligatorios.map(idCurso => {
            const cursoInfo = catalogoMap.get(idCurso) || { id: idCurso, id_curso: idCurso, nombre_oficial: `Curso no encontrado (${idCurso})` };
            const calificacion = cursosTomadosMap.get(idCurso);
            let estado: 'Aprobado' | 'Reprobado' | 'Pendiente' = 'Pendiente';
            if (calificacion !== undefined) {
                estado = calificacion >= 70 ? 'Aprobado' : 'Reprobado';
            }
            return { curso: cursoInfo, estado, calificacion };
        });
        const aprobados = cursosAsignados.filter(c => c.estado === 'Aprobado').length;
        coberturaCursos = perfil.cursos_obligatorios.length > 0 ? (aprobados / perfil.cursos_obligatorios.length) * 100 : 100;
    }
    
    if (historial?.cursos) {
        const cursosObligatoriosSet = new Set(perfil?.cursos_obligatorios || []);
        cursosExtras = historial.cursos
            .filter(c => !cursosObligatoriosSet.has(c.id_curso))
            .map(c => {
                const cursoInfo = catalogoMap.get(c.id_curso) || { id: c.id_curso, id_curso: c.id_curso, nombre_oficial: `Curso no encontrado (${c.id_curso})` };
                return { curso: cursoInfo, estado: c.calificacion >= 70 ? 'Aprobado' : 'Reprobado', calificacion: c.calificacion };
            });
        
        const totalCalificaciones = historial.cursos.reduce((sum, c) => sum + c.calificacion, 0);
        promedioGeneral = historial.cursos.length > 0 ? totalCalificaciones / historial.cursos.length : 0;
    }

    return { ...empleadoData, promocionData, coberturaCursos, cursosAsignados, cursosExtras, promedioGeneral };
  }, [isLoading, empleadoData, perfiles, historiales, promociones, catalogoCursos]);
  
  const reglaAplicable = reglasAscenso?.find(r => r.puesto_actual === empleadoPerfil?.puesto.titulo);
  const statusInfo = empleadoPerfil ? getStatusInfo(empleadoPerfil, reglaAplicable) : null;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  if (!empleadoPerfil) {
    return <div className="text-center py-20 text-muted-foreground">No se pudo cargar tu perfil.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Bienvenido, {empleadoPerfil.nombre_completo.split(' ')[0]}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{empleadoPerfil.puesto.titulo} | {empleadoPerfil.puesto.departamento}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-4 overflow-hidden">
            <div className={cn("p-6", statusColors[statusInfo!.status])}>
                <CardTitle className="text-2xl text-white flex items-center justify-between">
                    <div>Estatus del Plan de Carrera: <span className="font-bold">{statusInfo?.status}</span></div>
                </CardTitle>
                <CardDescription className="text-white/80 mt-1">{statusInfo?.message}</CardDescription>
            </div>
        </Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Progreso de Capacitación</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{empleadoPerfil.cursosAsignados.filter(c => c.estado === 'Aprobado').length} / {empleadoPerfil.cursosAsignados.length}</p><Progress value={empleadoPerfil.coberturaCursos} className="mt-2 h-2"/></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Promedio General</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{empleadoPerfil.promedioGeneral.toFixed(1)}%</p></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Evaluación Desempeño</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{empleadoPerfil.promocionData?.evaluacion_desempeno ?? 'N/A'}</p></CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Exámen Teórico</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{empleadoPerfil.promocionData?.examen_teorico ?? 'N/A'}</p></CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target/>Cursos Obligatorios</CardTitle>
                </CardHeader>
                <CardContent>
                    <CursosTable cursos={empleadoPerfil.cursosAsignados} />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles/>Cursos Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                    <CursosTable cursos={empleadoPerfil.cursosExtras} />
                </CardContent>
            </Card>
       </div>
    </motion.div>
  );
}

const CursosTable = ({ cursos }: { cursos: CursoConEstado[] }) => {
    return (
        <ScrollArea className="h-[40vh] rounded-lg border">
            <Table>
                <TableHeader className='sticky top-0 bg-background z-10'>
                    <TableRow>
                        <TableHead>Curso</TableHead>
                        <TableHead className="text-center w-24">Estado</TableHead>
                        <TableHead className="text-right w-28">Material</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {cursos.length > 0 ? cursos.map(({ curso, estado }) => (
                        <TableRow key={curso.id}>
                            <TableCell className="font-medium text-sm">{curso.nombre_oficial}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={estado === 'Aprobado' ? 'default' : estado === 'Reprobado' ? 'destructive' : 'outline'} className={cn(estado === 'Aprobado' && 'bg-green-500/80')}>{estado}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {estado === 'Pendiente' && curso.url_pdf && (
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={curso.url_pdf} target="_blank" rel="noopener noreferrer">
                                            <FileText className="h-4 w-4"/>
                                        </Link>
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No hay cursos en esta categoría.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};
