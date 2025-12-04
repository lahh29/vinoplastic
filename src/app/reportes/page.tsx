
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
interface Promocion { id: string; fecha_ultimo_cambio?: { toDate: () => Date }; examen_teorico?: number; evaluacion_practica?: 'Aprobada' | 'Reprobada' | 'Pendiente'; }
interface CursoCatalogo { id: string; nombre_oficial: string; }
interface EmpleadoPromocion extends Empleado {
  promocionData?: Promocion;
  coberturaCursos: number;
  cursosCompletadosNombres: string[];
  cursosPendientesNombres: string[];
}
type EstatusPromocion = 'Elegible' | 'En Progreso' | 'Máxima Categoría' | 'Requiere Atención' | 'Pendiente';


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

// Lógica de estatus (copiada de la página de categorías)
const getStatusInfo = (empleado: EmpleadoPromocion): { status: EstatusPromocion, message: string } => {
    const puesto = (empleado.puesto.titulo || '').toUpperCase();
    
    let rol: string | null = null;
    let categoriaMatch: RegExpMatchArray | null = null;

    if (puesto.startsWith('OPERADOR DE ACABADOS GP-12')) { rol = 'operador_acabados'; categoriaMatch = puesto.match(/GP-12\s([A-D])$/);
    } else if (puesto.startsWith('SUPERVISOR DE ACABADOS')) { rol = 'supervisor_acabados'; categoriaMatch = puesto.match(/GP12\s([A-C])$/);
    } else if (puesto.startsWith('INSPECTOR DE CALIDAD')) { rol = 'inspector'; categoriaMatch = puesto.match(/CALIDAD\s([A-D])$/);
    } else if (puesto.startsWith('INGENIERO DE CALIDAD')) { rol = 'ingeniero_calidad'; categoriaMatch = puesto.match(/CALIDAD\s([A-C])$/);
    } else if (puesto.startsWith('TÉCNICO DE MANTENIMIENTO A EDIFICIOS')) { rol = 'tecnico_edificios'; categoriaMatch = puesto.match(/EDIFICIOS\s([A-B])$/);
    } else if (puesto.startsWith('TÉCNICO DE MANTENIMIENTO')) { rol = 'tecnico_mantenimiento'; categoriaMatch = puesto.match(/MANTENIMIENTO\s([A-D])$/);
    } else if (puesto.startsWith('AUXILIAR DE MANTENIMIENTO')) { rol = 'auxiliar_mantenimiento'; categoriaMatch = puesto.match(/MANTENIMIENTO\s([A-C])$/);
    } else if (puesto.startsWith('TÉCNICO DE TALLER DE MOLDES')) { rol = 'tecnico_taller'; categoriaMatch = puesto.match(/MOLDES\s([A-E])$/);
    } else if (puesto.startsWith('OPERADOR DE MÁQUINA')) { rol = 'operador_maquina'; categoriaMatch = puesto.match(/MÁQUINA\s([A-D])$/);
    } else if (puesto.startsWith('MONTADOR DE MOLDES')) { rol = 'montador'; categoriaMatch = puesto.match(/MOLDES\s([A-C])$/);
    } else if (puesto.startsWith('ASISTENTE DE PRODUCCION')) { rol = 'asistente_produccion'; categoriaMatch = puesto.match(/PRODUCCION\s([A-B])$/);
    } else if (puesto.startsWith('SUPERVISOR DE PRODUCCIÓN')) { rol = 'supervisor_produccion'; categoriaMatch = puesto.match(/PRODUCCIÓN\s([A-D])$/);
    } else if (puesto.startsWith('INGENIERO DE PROCESO')) { rol = 'ingeniero_proceso'; categoriaMatch = puesto.match(/PROCESO\s([A-D])$/);
    } else if (puesto.startsWith('INGENIERO DE PROYECTOS')) { rol = 'ingeniero_proyectos'; categoriaMatch = puesto.match(/PROYECTOS\s([A-D])$/);
    } else if (puesto.startsWith('LIDER DE PROYECTOS')) { rol = 'lider_proyectos'; categoriaMatch = puesto.match(/PROYECTOS\s([A-C])$/);
    } else if (puesto.startsWith('AUXILIAR DE ALMACÉN')) { rol = 'auxiliar_almacen'; categoriaMatch = puesto.match(/ALMACÉN\s([A-D])$/);
    } else if (puesto.startsWith('AUXILIAR ADMINISTRATIVO DE ALMACÉN')) { rol = 'aux_admin_almacen'; categoriaMatch = puesto.match(/ALMACÉN\s([A-C])$/);
    } else if (puesto.startsWith('AUXILIAR DEL SGI')) { rol = 'aux_sgi'; categoriaMatch = puesto.match(/SGI\s([B-C])$/);
    } else if (puesto.startsWith('METRÓLOGO')) { rol = 'metrologo'; categoriaMatch = puesto.match(/METRÓLOGO\s([A-C])$/);
    } else if (puesto.startsWith('ANALISTA DE RECLUTAMIENTO Y SELECCIÓN')) { rol = 'analista_reclutamiento'; categoriaMatch = puesto.match(/SELECCIÓN\s([A-B])$/);
    } else if (puesto.startsWith('AUXILIAR DE LIMPIEZA')) { rol = 'auxiliar_limpieza'; categoriaMatch = puesto.match(/LIMPIEZA\s([A-B])$/);
    } else if (puesto.startsWith('AUXILIAR DE BÁSCULA')) { rol = 'auxiliar_bascula'; categoriaMatch = puesto.match(/BÁSCULA\s([A-C])$/);
    } else if (puesto.startsWith('CHECK LIST')) { rol = 'check_list'; categoriaMatch = puesto.match(/LIST\s([A-C])$/);
    } else if (puesto.startsWith('MATERIALISTA')) { rol = 'materialista'; categoriaMatch = puesto.match(/MATERIALISTA\s([A-C])$/);
    } else if (puesto.startsWith('PREPARADOR')) { rol = 'preparador'; categoriaMatch = puesto.match(/PREPARADOR\s([A-C])$/);
    } else if (puesto.startsWith('SCRAP')) { rol = 'scrap'; categoriaMatch = puesto.match(/SCRAP\s([A-C])$/);
    } else {
        return { status: 'Pendiente', message: 'Puesto no aplica.' };
    }

    if (!categoriaMatch) return { status: 'Pendiente', message: 'No se pudo determinar la categoría.' };
    const categoria = categoriaMatch[1];
    
    const allRules: any = {
      operador_acabados: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 30, tiempo: 6 }, 'D': { cursos: 0, tiempo: 3 } },
      supervisor_acabados: { 'A': null, 'B': { cursos: 90, tiempo: 8 }, 'C': { cursos: 80, tiempo: 6 } },
      inspector: { 'A': null, 'B': { cursos: 70, tiempo: 6 }, 'C': { cursos: 50, tiempo: 6 }, 'D': { cursos: 0, tiempo: 6 } },
      ingeniero_calidad: { 'A': null, 'B': { cursos: 90, tiempo: 9 }, 'C': { cursos: 80, tiempo: 9 } },
      tecnico_mantenimiento: { 'A': null, 'B': { cursos: 50, tiempo: 8 }, 'C': { cursos: 30, tiempo: 8 }, 'D': { cursos: 0, tiempo: 8 } },
      auxiliar_mantenimiento: { 'A': null, 'B': { cursos: 50, tiempo: 6 }, 'C': { cursos: 0, tiempo: 3 } },
      tecnico_edificios: { 'A': null, 'B': { cursos: 90, tiempo: 8 } },
      tecnico_taller: { 'A': null, 'B': { cursos: 90, tiempo: 18 }, 'C': { cursos: 80, tiempo: 12 }, 'D': { cursos: 50, tiempo: 12 }, 'E': { cursos: 30, tiempo: 6 } },
      operador_maquina: { 'A': null, 'B': { cursos: 90, tiempo: 6 }, 'C': { cursos: 60, tiempo: 6 }, 'D': { cursos: 30, tiempo: 3 } },
      montador: { 'A': null, 'B': { cursos: 90, tiempo: 12 }, 'C': { cursos: 60, tiempo: 6 } },
      asistente_produccion: { 'A': null, 'B': { cursos: 60, tiempo: 12 }},
      supervisor_produccion: { 'A': null, 'B': { cursos: 60, tiempo: 12 }, 'C': { cursos: 30, tiempo: 6 }, 'D': { cursos: 0, tiempo: 6 } },
      ingeniero_proceso: { 'A': null, 'B': { cursos: 60, tiempo: 12 }, 'C': { cursos: 30, tiempo: 6 }, 'D': { cursos: 0, tiempo: 6 } },
      ingeniero_proyectos: { 'A': null, 'B': { cursos: 60, tiempo: 12 }, 'C': { cursos: 30, tiempo: 6 }, 'D': { cursos: 0, tiempo: 6 } },
      lider_proyectos: { 'A': null, 'B': { cursos: 60, tiempo: 12 }, 'C': { cursos: 0, tiempo: 6 } },
      auxiliar_almacen: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 30, tiempo: 6 }, 'D': { cursos: 0, tiempo: 6 } },
      aux_admin_almacen: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 30, tiempo: 6 } },
      aux_sgi: { 'B': null, 'C': { cursos: 0, tiempo: 8 } },
      metrologo: { 'A': null, 'B': { cursos: 70, tiempo: 8 }, 'C': { cursos: 0, tiempo: 6 } },
      analista_reclutamiento: { 'A': null, 'B': { cursos: 90, tiempo: 6 } },
      auxiliar_limpieza: { 'A': null, 'B': { cursos: 90, tiempo: 6 } },
      auxiliar_bascula: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 0, tiempo: 6 } },
      check_list: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 0, tiempo: 6 } },
      materialista: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 0, tiempo: 6 } },
      preparador: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 0, tiempo: 6 } },
      scrap: { 'A': null, 'B': { cursos: 60, tiempo: 6 }, 'C': { cursos: 0, tiempo: 6 } },
    };

    if (rol && allRules[rol] && allRules[rol][categoria] === null) return { status: 'Máxima Categoría', message: 'Categoría más alta alcanzada.' };
    const reglas = rol ? allRules[rol]?.[categoria] : null;
    if (!reglas) return { status: 'Pendiente', message: 'Sin reglas de promoción.' };

    const fechaCambio = empleado.promocionData?.fecha_ultimo_cambio ? parseDate(empleado.promocionData.fecha_ultimo_cambio) : null;
    if (!fechaCambio) return { status: 'Pendiente', message: 'Falta fecha de último cambio.' };
    
    const mesesDesdeCambio = differenceInMonths(new Date(), fechaCambio);
    const { cursos: cursosRequeridos, tiempo: tiempoEspera } = reglas;

    if (mesesDesdeCambio < tiempoEspera) return { status: 'En Progreso', message: `Necesita ${tiempoEspera} meses, tiene ${mesesDesdeCambio}.` };
    if (empleado.coberturaCursos < cursosRequeridos) return { status: 'Requiere Atención', message: `Requiere ${cursosRequeridos}% de cursos y tiene ${empleado.coberturaCursos.toFixed(0)}%.` };
    return { status: 'Elegible', message: `¡Listo para evaluación!` };
};


export default function ReportesPage() {
    const firestore = useFirestore();

    const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
    const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
    const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
    const promocionesRef = useMemoFirebase(() => collection(firestore, 'Promociones'), [firestore]);
    const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

    const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
    const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
    const { data: historiales, isLoading: l3 } = useCollection<Historial>(historialRef);
    const { data: promociones, isLoading: l4 } = useCollection<Promocion>(promocionesRef);
    const { data: catalogoCursos, isLoading: l5 } = useCollection<CursoCatalogo>(catalogoCursosRef);
    
    const isLoading = l1 || l2 || l3 || l4 || l5;

    const datosProcesados = useMemo(() => {
        if (isLoading || !empleados || !perfiles || !historiales || !promociones || !catalogoCursos) return null;
        
        const historialesMap = new Map(historiales.map(h => [h.id_empleado, h.cursos]));
        const promocionesMap = new Map(promociones.map(p => [p.id, p]));
        const catalogoMap = new Map(catalogoCursos.map(c => [c.id, c.nombre_oficial]));

        return empleados.map(emp => {
            const perfil = perfiles.find(p => p.nombre_puesto === emp.puesto.titulo);
            let coberturaCursos = 0;
            let cursosCompletadosNombres: string[] = [];
            let cursosPendientesNombres: string[] = [];

            if (perfil) {
                const cursosCompletadosMap = new Map((historialesMap.get(emp.id_empleado) || []).filter(c => c.calificacion >= 70).map(c => [c.id_curso, c]));
                const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
                
                const completadosIds = Array.from(cursosCompletadosMap.keys()).filter(id => cursosObligatoriosIds.has(id));
                cursosCompletadosNombres = completadosIds.map(id => catalogoMap.get(id) || id);

                const pendientesIds = perfil.cursos_obligatorios.filter(id => !cursosCompletadosMap.has(id));
                cursosPendientesNombres = pendientesIds.map(id => catalogoMap.get(id) || id);

                coberturaCursos = cursosObligatoriosIds.size > 0 ? (completadosIds.length / cursosObligatoriosIds.size) * 100 : 100;
            }
            const promocionData = promocionesMap.get(emp.id_empleado);
            return { ...emp, coberturaCursos, promocionData, cursosCompletadosNombres, cursosPendientesNombres };
        });
    }, [isLoading, empleados, perfiles, historiales, promociones, catalogoCursos]);

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
                const value = row[key];
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
                const plantillaData = datosProcesados.map(emp => ({ ...emp, ...emp.puesto }));
                csvContent = convertToCSV(plantillaData, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "departamento": "Departamento", "titulo": "Puesto" });
                break;
            case 'cumplimiento':
                const cumplimientoData = datosProcesados.map(emp => ({
                    id_empleado: emp.id_empleado,
                    nombre_completo: emp.nombre_completo,
                    puesto: emp.puesto.titulo,
                    departamento: emp.puesto.departamento,
                    porcentaje: emp.coberturaCursos.toFixed(0) + '%',
                    cursos_completados: emp.cursosCompletadosNombres.join('; '),
                    cursos_pendientes: emp.cursosPendientesNombres.join('; ')
                }));
                csvContent = convertToCSV(cumplimientoData, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto": "Puesto", "departamento": "Departamento", "porcentaje": "Cumplimiento", "cursos_completados": "Cursos Completados", "cursos_pendientes": "Cursos Pendientes" });
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
                    .filter(emp => getStatusInfo(emp).status !== 'Pendiente')
                    .map(emp => ({
                        id_empleado: emp.id_empleado,
                        nombre_completo: emp.nombre_completo,
                        puesto: emp.puesto.titulo,
                        estatus: getStatusInfo(emp).status,
                        mensaje_estatus: getStatusInfo(emp).message,
                        cobertura_cursos: emp.coberturaCursos.toFixed(0) + '%',
                        ultimo_cambio: emp.promocionData?.fecha_ultimo_cambio ? format(parseDate(emp.promocionData.fecha_ultimo_cambio)!, 'dd/MM/yyyy') : 'N/A',
                        examen_teorico: emp.promocionData?.examen_teorico ?? 'N/A',
                        evaluacion_practica: emp.promocionData?.evaluacion_practica ?? 'N/A'
                    }));
                csvContent = convertToCSV(categoriasData, { "id_empleado": "ID Empleado", "nombre_completo": "Nombre", "puesto": "Puesto", "estatus": "Estatus Promoción", "mensaje_estatus": "Detalle de Estatus", "cobertura_cursos": "% Cursos", "ultimo_cambio": "Fecha Últ. Cambio", "examen_teorico": "Examen Teórico", "evaluacion_practica": "Eval. Práctica" });
                break;
            case 'historial':
                if(!historiales || !empleados || !catalogoCursos) break;
                const empleadoMap = new Map(empleados.map(e => [e.id_empleado, e]));
                const catalogoMap = new Map(catalogoCursos.map(c => [c.id, c.nombre_oficial]));
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
