
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookCheck, TrendingUp, Download, Building, Loader2, History } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { format, isValid, differenceInMonths } from 'date-fns';

// Interfaces
interface Empleado { id: string; id_empleado: string; nombre_completo: string; puesto: { titulo: string; departamento: string; }; }
interface PerfilPuesto { id: string; nombre_puesto: string; cursos_obligatorios: string[]; }
interface HistorialCurso { id_curso: string; calificacion: number; fecha_aplicacion: string; }
interface Historial { id: string; id_empleado: string; cursos: HistorialCurso[]; }
interface Promocion { id: string; fecha_ultimo_cambio?: { toDate: () => Date }; examen_teorico?: number; evaluacion_desempeno?: number; no_apto?: boolean; }
interface CursoCatalogo { id: string; id_curso: string; nombre_oficial: string; }
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
  cursosCompletadosNombres: string[];
  cursosPendientesNombres: string[];
}
type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente' | 'No Apto';


const reportTypes = [
    {
        icon: Users,
        title: "Plantilla General",
        description: "Descarga un listado completo de todos los empleados activos, incluyendo sus puestos y departamentos.",
        id: "plantilla"
    },
    {
        icon: BookCheck,
        title: "Cumplimiento de Capacitación",
        description: "Genera un reporte detallado del porcentaje de cumplimiento y los cursos pendientes de cada empleado.",
        id: "cumplimiento"
    },
    {
        icon: History,
        title: "Historial de Cursos",
        description: "Exporta el historial completo de todos los cursos tomados por cada empleado, con fechas y calificaciones.",
        id: "historial"
    },
    {
        icon: Building,
        title: "Reporte por Departamento",
        description: "Consulta el progreso general de capacitación agrupado por cada departamento de la empresa.",
        id: "departamento"
    },
    {
        icon: TrendingUp,
        title: "Cambios de Categoría",
        description: "Exporta un informe con los empleados elegibles para promoción y el estado de su plan de carrera.",
        id: "categorias"
    }
]

// Helper para parsear fechas
const parseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date.toDate) return date.toDate();
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return isValid(d) ? d : null;
  }
  return null;
};

// Lógica de estatus
const getStatusInfo = (empleado: EmpleadoPromocion, regla?: ReglaAscenso): { status: EstatusPromocion, message: string } => {
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


export default function ReportesPage() {
    const firestore = useFirestore();

    const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
    const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
    const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
    const promocionesRef = useMemoFirebase(() => collection(firestore, 'Promociones'), [firestore]);
    const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
    const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);

    const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
    const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
    const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
    const { data: promociones, isLoading: l4 } = useCollection<Promocion>(promocionesRef);
    const { data: catalogoCursos, isLoading: l5 } = useCollection<CursoCatalogo>(catalogoCursosRef);
    const { data: reglasAscenso, isLoading: l6 } = useCollection<ReglaAscenso>(reglasAscensoRef);
    
    const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

    const datosProcesados = useMemo(() => {
        if (isLoading || !empleados || !perfiles || !historiales || !promociones || !catalogoCursos || !reglasAscenso) return null;
        
        const historialesMap = new Map(historiales.map(h => [h.id_empleado, h.cursos]));
        const promocionesMap = new Map(promociones.map(p => [p.id, p]));
        const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c]));
        const reglasMap = new Map(reglasAscenso.map(r => [r.puesto_actual, r]));

        return empleados.map(emp => {
            const perfil = perfiles.find(p => p.nombre_puesto === emp.puesto.titulo);
            let coberturaCursos = 0;
            let cursosCompletadosNombres: string[] = [];
            let cursosPendientesNombres: string[] = [];

            if (perfil) {
                const cursosCompletadosMap = new Map((historialesMap.get(emp.id_empleado) || []).filter(c => c.calificacion >= 70).map(c => [c.id_curso, c]));
                const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
                
                const completadosIds = Array.from(cursosCompletadosMap.keys()).filter(id => cursosObligatoriosIds.has(id));
                cursosCompletadosNombres = completadosIds.map(id => catalogoMap.get(id)?.nombre_oficial || id);

                const pendientesIds = perfil.cursos_obligatorios.filter(id => !cursosCompletadosMap.has(id));
                cursosPendientesNombres = pendientesIds.map(id => catalogoMap.get(id)?.nombre_oficial || id);

                coberturaCursos = cursosObligatoriosIds.size > 0 ? (completadosIds.length / cursosObligatoriosIds.size) * 100 : 100;
            }
            const promocionData = promocionesMap.get(emp.id_empleado);
            const empleadoProcesado = { ...emp, coberturaCursos, promocionData, cursosCompletadosNombres, cursosPendientesNombres };
            const reglaAplicable = reglasMap.get(emp.puesto.titulo);
            const statusInfo = getStatusInfo(empleadoProcesado, reglaAplicable);
            
            return { ...empleadoProcesado, statusInfo };
        });
    }, [isLoading, empleados, perfiles, historiales, promociones, catalogoCursos, reglasAscenso]);

    const downloadCSV = (content: string, fileName: string) => {
        const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    const convertToCSV = (data: any[], headers: Record<string, string>) => {
        const headerKeys = Object.keys(headers);
        const headerTitles = Object.values(headers);

        const headerRow = headerTitles.join(',');
        const rows = data.map(row => 
            headerKeys.map(key => {
                const value = key.split('.').reduce((o, i) => (o ? o[i] : ''), row);
                const stringValue = (value === null || value === undefined) ? '' : String(value);
                return `"${stringValue.replace(/"/g, '""')}"`;
            }).join(',')
        );
        return [headerRow, ...rows].join('\n');
    };

    const handleDownload = (reportType: string) => {
        if (!datosProcesados) return;

        let csvContent = '';
        let fileName = `${reportType.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

        switch(reportType) {
            case 'plantilla':
                csvContent = convertToCSV(datosProcesados, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto.departamento": "Departamento", "puesto.titulo": "Puesto" });
                break;
            case 'cumplimiento':
                const cumplimientoData = datosProcesados.map(emp => ({
                    ...emp,
                    porcentaje: emp.coberturaCursos.toFixed(0) + '%',
                    cursos_completados_str: emp.cursosCompletadosNombres.join('; '),
                    cursos_pendientes_str: emp.cursosPendientesNombres.join('; ')
                }));
                csvContent = convertToCSV(cumplimientoData, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto.titulo": "Puesto", "puesto.departamento": "Departamento", "porcentaje": "Cumplimiento", "cursos_completados_str": "Cursos Completados", "cursos_pendientes_str": "Cursos Pendientes" });
                break;
            case 'departamento':
                const porDepto: {[key: string]: { total: number, suma_cumplimiento: number }} = {};
                datosProcesados.forEach(emp => {
                    const depto = emp.puesto.departamento || "Sin Depto.";
                    if (!porDepto[depto]) porDepto[depto] = { total: 0, suma_cumplimiento: 0 };
                    porDepto[depto].total++;
                    porDepto[depto].suma_cumplimiento += emp.coberturaCursos;
                });
                const deptoData = Object.entries(porDepto).map(([departamento, data]) => ({
                    departamento,
                    empleados: data.total,
                    cumplimiento_promedio: (data.suma_cumplimiento / data.total).toFixed(1) + '%'
                }));
                csvContent = convertToCSV(deptoData, { "departamento": "Departamento", "empleados": "N° de Empleados", "cumplimiento_promedio": "Cumplimiento Promedio" });
                break;
            case 'categorias':
                 const categoriasData = datosProcesados
                    .filter(emp => emp.statusInfo.status !== 'Pendiente')
                    .map(emp => ({
                        id_empleado: emp.id_empleado,
                        nombre_completo: emp.nombre_completo,
                        puesto: emp.puesto.titulo,
                        estatus: emp.statusInfo.status,
                        mensaje_estatus: emp.statusInfo.message,
                        cobertura_cursos: emp.coberturaCursos.toFixed(0) + '%',
                        ultimo_cambio: emp.promocionData?.fecha_ultimo_cambio ? format(parseDate(emp.promocionData.fecha_ultimo_cambio)!, 'dd/MM/yyyy') : 'N/A',
                        evaluacion_desempeno: emp.promocionData?.evaluacion_desempeno ?? 'N/A',
                        examen_teorico: emp.promocionData?.examen_teorico ?? 'N/A',
                    }));
                csvContent = convertToCSV(categoriasData, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto": "Puesto", "estatus": "Estatus Promoción", "mensaje_estatus": "Detalle de Estatus", "cobertura_cursos": "% Cursos", "ultimo_cambio": "Fecha Últ. Cambio", "evaluacion_desempeno": "Eval. Desempeño", "examen_teorico": "Examen Teórico" });
                break;
            case 'historial':
                if(!historiales || !empleados || !catalogoCursos) break;
                const empleadoMap = new Map(empleados.map(e => [e.id_empleado, e]));
                const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c.nombre_oficial]));
                const historialCompleto = historiales.flatMap(hist =>
                    (hist.cursos || []).map(curso => {
                        const empleado = empleadoMap.get(hist.id_empleado);
                        return {
                            id_empleado: hist.id_empleado,
                            nombre_completo: empleado?.nombre_completo || 'N/A',
                            puesto: empleado?.puesto.titulo || 'N/A',
                            curso_nombre: catalogoMap.get(curso.id_curso) || curso.id_curso,
                            calificacion: curso.calificacion,
                            fecha: curso.fecha_aplicacion,
                        }
                    })
                );
                csvContent = convertToCSV(historialCompleto, {"id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto": "Puesto", "curso_nombre": "Curso", "calificacion": "Calificación", "fecha": "Fecha Aplicación" });
                break;
        }

        downloadCSV(csvContent, fileName);
    };

    return (
        <div className="space-y-8">
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold tracking-tight">Generador de Reportes</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Selecciona el tipo de informe que deseas generar. Los datos se exportarán en un formato compatible con Excel (CSV).
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reportTypes.map(report => (
                    <Card key={report.title} className="flex flex-col justify-between rounded-2xl shadow-lg border-border/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <report.icon className="h-6 w-6 text-primary"/>
                                {report.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>{report.description}</CardDescription>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => handleDownload(report.id)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                                Generar y Descargar
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
