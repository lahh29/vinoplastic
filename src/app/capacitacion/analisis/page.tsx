
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, AlertTriangle, CheckCircle, Search, Eye, BookOpen, BookCheck, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

// Interfaces
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
interface HistorialCurso {
    id_curso: string;
    calificacion: number;
    fecha_aplicacion: string; // Formato "DD/MM/YYYY"
}
interface Historial {
  id: string;
  id_empleado: string;
  cursos: HistorialCurso[];
}
interface CursoCatalogo {
  id: string;
  nombre_oficial: string;
}

interface EmpleadoAnalisis {
  id: string;
  nombre_completo: string;
  id_empleado: string;
  puesto: string;
  departamento: string;
  porcentaje_cumplimiento: number;
  estatus: 'COMPLETO' | 'PARCIAL' | 'CRÍTICO' | 'SIN_PERFIL_DEFINIDO';
  cursos_obligatorios: CursoCatalogo[];
  cursos_completados: CursoCatalogo[];
  cursos_pendientes: CursoCatalogo[];
}

// Colors for charts and progress bars
const ESTATUS_COLORS = {
  COMPLETO: { light: 'hsl(142.1 76.2% 36.3%)', dark: 'hsl(142.1 70.6% 45.3%)', name: 'emerald' },
  PARCIAL: { light: 'hsl(47.9 95.8% 53.1%)', dark: 'hsl(47.9 95.8% 53.1%)', name: 'amber' },
  CRÍTICO: { light: 'hsl(0 84.2% 60.2%)', dark: 'hsl(0 72.2% 50.6%)', name: 'red' },
  SIN_PERFIL_DEFINIDO: { light: 'hsl(215.4 16.3% 46.9%)', dark: 'hsl(215.3 13.9% 64.9%)', name: 'slate' },
};

const YEAR_COLORS = ["hsl(var(--primary))", "hsl(22, 84%, 60%)", "hsl(180, 84%, 60%)"];

const KPI_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// Main Component
export default function AnalisisCapacitacionPage() {
  const firestore = useFirestore();

  // Data fetching
  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const historialRef = useMemoFirebase(() => collection(firestore, 'historial_capacitacion'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: loadingPerfiles } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: historiales, isLoading: loadingHistoriales } = useCollection<Historial>(historialRef);
  const { data: catalogoCursos, isLoading: loadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);
  
  const [analisisCompleto, setAnalisisCompleto] = useState<EmpleadoAnalisis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFilter, setDepartamentoFilter] = useState('todos');
  const [selectedEmpleadoModal, setSelectedEmpleadoModal] = useState<EmpleadoAnalisis | null>(null);
  const [isCertificadosModalOpen, setIsCertificadosModalOpen] = useState(false);
  const [isCriticosModalOpen, setIsCriticosModalOpen] = useState(false);
  
  const [year1, setYear1] = useState<string>(new Date().getFullYear().toString());
  const [year2, setYear2] = useState<string | undefined>((new Date().getFullYear() - 1).toString());


  const isLoading = loadingEmpleados || loadingPerfiles || loadingHistoriales || loadingCursos;

  useEffect(() => {
    if (isLoading || !empleados || !perfiles || !historiales || !catalogoCursos) return;

    const catalogoMap = new Map(catalogoCursos.map(c => [c.id, c.nombre_oficial]));
    const historialesMap = new Map(historiales.map(h => [h.id_empleado, h.cursos.filter(c => c.calificacion >= 70).map(c => c.id_curso)]));

    const analisis = empleados.map((empleado): EmpleadoAnalisis => {
      const perfil = perfiles.find(p => p.nombre_puesto === empleado.puesto.titulo);
      
      if (!perfil) {
        return {
          id: empleado.id,
          nombre_completo: empleado.nombre_completo,
          id_empleado: empleado.id_empleado,
          puesto: empleado.puesto.titulo,
          departamento: empleado.puesto.departamento,
          porcentaje_cumplimiento: 0,
          estatus: 'SIN_PERFIL_DEFINIDO',
          cursos_obligatorios: [],
          cursos_completados: [],
          cursos_pendientes: [],
        };
      }

      const cursosCompletadosIds = new Set(historialesMap.get(empleado.id_empleado) || []);
      const cursosObligatoriosIds = new Set(perfil.cursos_obligatorios);
      
      const cursosCompletadosFiltrados = Array.from(cursosCompletadosIds).filter(id => cursosObligatoriosIds.has(id));
      const porcentaje = cursosObligatoriosIds.size > 0 ? (cursosCompletadosFiltrados.length / cursosObligatoriosIds.size) * 100 : 100;
      
      let estatus: EmpleadoAnalisis['estatus'];
      if (porcentaje >= 99.9) estatus = 'COMPLETO';
      else if (porcentaje > 0) estatus = 'PARCIAL';
      else estatus = 'CRÍTICO';

      const cursos_pendientes_ids = perfil.cursos_obligatorios.filter(id => !cursosCompletadosIds.has(id));

      return {
        id: empleado.id,
        nombre_completo: empleado.nombre_completo,
        id_empleado: empleado.id_empleado,
        puesto: empleado.puesto.titulo,
        departamento: empleado.puesto.departamento,
        porcentaje_cumplimiento: porcentaje,
        estatus,
        cursos_obligatorios: perfil.cursos_obligatorios.map(id => ({ id, nombre_oficial: catalogoMap.get(id) || 'Nombre no encontrado' })),
        cursos_completados: cursosCompletadosFiltrados.map(id => ({ id, nombre_oficial: catalogoMap.get(id) || 'Nombre no encontrado' })),
        cursos_pendientes: cursos_pendientes_ids.map(id => ({ id, nombre_oficial: catalogoMap.get(id) || 'Nombre no encontrado' })),
      };
    });
    setAnalisisCompleto(analisis);
  }, [isLoading, empleados, perfiles, historiales, catalogoCursos]);
  
  const filteredData = useMemo(() => {
    return analisisCompleto.filter(emp => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = emp.nombre_completo.toLowerCase().includes(searchTermLower) || emp.id_empleado.toLowerCase().includes(searchTermLower);
      const matchesDept = departamentoFilter === 'todos' || emp.departamento === departamentoFilter;
      return matchesSearch && matchesDept;
    });
  }, [analisisCompleto, searchTerm, departamentoFilter]);

  const kpis = useMemo(() => {
    const total = analisisCompleto.length;
    if (total === 0) return { total: 0, cumplimientoGlobal: 0, criticos: 0, certificados: 0 };
    const cumplimientoGlobal = analisisCompleto.reduce((acc, emp) => acc + emp.porcentaje_cumplimiento, 0) / total;
    const criticos = analisisCompleto.filter(e => e.estatus === 'CRÍTICO' || e.estatus === 'SIN_PERFIL_DEFINIDO').length;
    const certificados = analisisCompleto.filter(e => e.estatus === 'COMPLETO').length;
    return { total, cumplimientoGlobal, criticos, certificados };
  }, [analisisCompleto]);

  const estatusDistribution = useMemo(() => {
    const counts: Record<EmpleadoAnalisis['estatus'], number> = { COMPLETO: 0, PARCIAL: 0, CRÍTICO: 0, SIN_PERFIL_DEFINIDO: 0 };
    analisisCompleto.forEach(e => { counts[e.estatus]++; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name as EmpleadoAnalisis['estatus'], value }))
      .filter(item => item.value > 0);
  }, [analisisCompleto]);

 const { historicoCursos, availableYears } = useMemo(() => {
    const dataByYear: { [year: string]: { [month: string]: Set<string> } } = {};
    const years = new Set<string>();

    historiales?.forEach(hist => {
      hist.cursos?.forEach(curso => {
        if (!curso.fecha_aplicacion) return;
        const parts = curso.fecha_aplicacion.split('/');
        if (parts.length !== 3) return;
        
        const year = parts[2];
        if(isNaN(parseInt(year, 10)) || year.length !== 4) return;
        
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        
        years.add(year);

        if (!dataByYear[year]) {
          dataByYear[year] = {};
        }
        if (!dataByYear[year][month]) {
          dataByYear[year][month] = new Set();
        }
        dataByYear[year][month].add(curso.id_curso);
      });
    });

    const selectedYears = [year1, year2].filter(Boolean) as string[];

    const chartData = Array.from({ length: 12 }).map((_, i) => {
        const monthEntry: { name: string; [key: string]: any } = {
          name: format(new Date(2000, i), 'MMM', { locale: es }),
        };
        selectedYears.forEach(year => {
          monthEntry[`total${year}`] = dataByYear[year]?.[i]?.size || 0;
        });
        return monthEntry;
      });

    return {
      historicoCursos: chartData,
      availableYears: Array.from(years).sort((a,b) => parseInt(b, 10) - parseInt(a, 10)),
    };
  }, [historiales, year1, year2]);

  const empleadosCertificados = useMemo(() => {
    return analisisCompleto.filter(e => e.estatus === 'COMPLETO');
  }, [analisisCompleto]);
  
  const empleadosCriticos = useMemo(() => {
    return analisisCompleto.filter(e => e.estatus === 'CRÍTICO' || e.estatus === 'SIN_PERFIL_DEFINIDO');
  }, [analisisCompleto]);


  const departamentos = useMemo(() => {
    if (!empleados) return [];
    return Array.from(new Set(empleados.map(e => e.puesto.departamento))).sort();
  }, [empleados]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Cargando datos del dashboard...</p></div>;
  }
  
  return (
    <div className="space-y-8 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl font-bold tracking-tight">Análisis de Cumplimiento</h1>
            <CardDescription className="text-lg text-muted-foreground mt-1">Una vista general del progreso de capacitación.</CardDescription>
        </motion.div>

        {/* KPIs */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div key="total-plantilla" initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.1 }} variants={KPI_VARIANTS}>
                <Card className="rounded-2xl shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-md font-medium">Total Plantilla</CardTitle><Users className="h-5 w-5 text-blue-400" /></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{kpis.total}</div></CardContent>
                </Card>
            </motion.div>
            <motion.div key="cumplimiento-global" initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.2 }} variants={KPI_VARIANTS}>
                <Card className="rounded-2xl shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-md font-medium">Cumplimiento Global</CardTitle><CheckCircle className="h-5 w-5 text-emerald-400" /></CardHeader>
                    <CardContent><div className="text-3xl font-bold">{`${kpis.cumplimientoGlobal.toFixed(1)}%`}</div></CardContent>
                </Card>
            </motion.div>
             <motion.div key="personal-critico" initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.3 }} variants={KPI_VARIANTS}>
                <button className="w-full text-left" onClick={() => setIsCriticosModalOpen(true)}>
                    <Card className="rounded-2xl shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1 bg-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-md font-medium">Personal Crítico</CardTitle><AlertTriangle className="h-5 w-5 text-red-400" /></CardHeader>
                        <CardContent><div className="text-3xl font-bold">{kpis.criticos}</div></CardContent>
                    </Card>
                </button>
            </motion.div>
             <motion.div key="cumplimiento-100" initial="hidden" animate="visible" transition={{ duration: 0.5, delay: 0.4 }} variants={KPI_VARIANTS}>
                <button className="w-full text-left" onClick={() => setIsCertificadosModalOpen(true)}>
                    <Card className="rounded-2xl shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1 bg-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-md font-medium">Cumplimiento al 100%</CardTitle><CheckCircle className="h-5 w-5 text-sky-400" /></CardHeader>
                        <CardContent><div className="text-3xl font-bold">{kpis.certificados}</div></CardContent>
                    </Card>
                </button>
            </motion.div>
        </div>

        {/* Charts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 rounded-2xl shadow-lg border-0 bg-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <CardTitle>Cursos Únicos</CardTitle>
                        <CardDescription>Comparativa anual de la actividad de capacitación.</CardDescription>
                    </div>
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="year1-select" className="text-sm font-medium">Año Principal:</Label>
                          <Select value={year1} onValueChange={setYear1}>
                            <SelectTrigger className="w-[120px] rounded-full" id="year1-select">
                              <SelectValue placeholder="Año 1" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableYears.map(year => <SelectItem key={`y1-${year}`} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="year2-select" className="text-sm font-medium">Comparar con:</Label>
                           <Select value={year2} onValueChange={(value) => setYear2(value === 'ninguno' ? undefined : value)}>
                            <SelectTrigger className="w-[120px] rounded-full" id="year2-select">
                              <SelectValue placeholder="Año 2" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ninguno">Ninguno</SelectItem>
                              {availableYears.filter(y => y !== year1).map(year => <SelectItem key={`y2-${year}`} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={historicoCursos}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <Tooltip 
                        cursor={{fill: 'hsl(var(--accent))', radius: 4}} 
                        contentStyle={{
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                        }} 
                    />
                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    {year1 && <Bar dataKey={`total${year1}`} name={year1} fill={YEAR_COLORS[0]} radius={[4, 4, 0, 0]} />}
                    {year2 && <Bar dataKey={`total${year2}`} name={year2} fill={YEAR_COLORS[1]} radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3 rounded-2xl shadow-lg border-0 bg-card">
              <CardHeader>
                <CardTitle>Distribución de Estatus</CardTitle>
                <CardDescription>Resumen del estado de cumplimiento de toda la plantilla.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                          <Tooltip contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}} />
                          <Pie data={estatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                            {estatusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={ESTATUS_COLORS[entry.name]?.dark || ESTATUS_COLORS.SIN_PERFIL_DEFINIDO.dark} />
                            ))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center space-y-3">
                      {estatusDistribution.map(entry => (
                          <div key={entry.name} className="flex items-center">
                              <div className="h-3 w-3 rounded-full mr-3" style={{ backgroundColor: ESTATUS_COLORS[entry.name]?.dark || ESTATUS_COLORS.SIN_PERFIL_DEFINIDO.dark }}/>
                              <div className="flex justify-between w-full">
                                  <span className="text-sm text-muted-foreground">{entry.name.replace(/_/g, ' ')}</span>
                                  <span className="font-semibold text-sm">{entry.value} ({ kpis.total > 0 ? (entry.value / kpis.total * 100).toFixed(1) : 0 }%)</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </CardContent>
            </Card>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
            <Card className="rounded-2xl shadow-lg border-0 bg-card">
                <CardHeader>
                <CardTitle>Detalle de Cumplimiento por Empleado</CardTitle>
                <CardDescription>
                    Busca y filtra para ver el estado de la capacitación de cada colaborador.
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nombre o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-full" /></div>
                    <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}><SelectTrigger className="w-full sm:w-[220px] rounded-full"><SelectValue placeholder="Filtrar por Depto." /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los Deptos.</SelectItem>{departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
                </div>
                </CardHeader>
                <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader><TableRow className="border-b-border hover:bg-accent/50"><TableHead>Nombre</TableHead><TableHead>Puesto</TableHead><TableHead>Departamento</TableHead><TableHead className="w-[25%]">Cumplimiento</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredData.map(emp => (
                        <TableRow key={emp.id} className="border-b-border hover:bg-accent/50">
                            <TableCell><div className="font-medium">{emp.nombre_completo}</div><div className="text-xs text-muted-foreground">ID: {emp.id_empleado}</div></TableCell>
                            <TableCell>{emp.puesto}</TableCell>
                            <TableCell><Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">{emp.departamento}</Badge></TableCell>
                            <TableCell><div className="flex items-center gap-2"><Progress value={emp.porcentaje_cumplimiento} indicatorClassName={cn({ 'bg-emerald-500': emp.estatus === 'COMPLETO', 'bg-amber-500': emp.estatus === 'PARCIAL', 'bg-red-500': emp.estatus === 'CRÍTICO', 'bg-slate-500': emp.estatus === 'SIN_PERFIL_DEFINIDO'})} /><span className="text-xs font-medium">{emp.porcentaje_cumplimiento.toFixed(0)}%</span></div></TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedEmpleadoModal(emp)}><Eye className="h-4 w-4" /><span className="sr-only">Ver Detalles</span></Button></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                </CardContent>
            </Card>
        </motion.div>

        {/* Modal Detalles Empleado */}
        {selectedEmpleadoModal && (
            <Dialog open={!!selectedEmpleadoModal} onOpenChange={() => setSelectedEmpleadoModal(null)}>
            <DialogContent className="sm:max-w-2xl bg-card rounded-2xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedEmpleadoModal.nombre_completo}</DialogTitle>
                    <DialogDescription>{selectedEmpleadoModal.puesto} | {selectedEmpleadoModal.departamento}</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh]">
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 text-red-500"><BookOpen className="h-5 w-5"/>Cursos Pendientes ({selectedEmpleadoModal.cursos_pendientes.length})</h3>
                        <ScrollArea className="h-64 rounded-xl border p-3 bg-red-500/5">
                             <div className="space-y-2">
                                {selectedEmpleadoModal.cursos_pendientes.length > 0 ? 
                                    selectedEmpleadoModal.cursos_pendientes.map(c => <div key={c.id} className="text-sm p-2 bg-card/80 rounded-md shadow-sm">{c.nombre_oficial}</div>) :
                                    <div className="text-sm text-center py-10 text-muted-foreground">¡Felicidades! Ningún curso pendiente.</div>
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
                                     <div className="text-sm text-center py-10 text-muted-foreground">Aún no se han completado cursos obligatorios.</div>
                                }
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
            </Dialog>
        )}
        
        {/* Modal Empleados Certificados */}
        <Dialog open={isCertificadosModalOpen} onOpenChange={setIsCertificadosModalOpen}>
            <DialogContent className="sm:max-w-lg rounded-2xl bg-card">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-sky-400" />
                        Personal con Cumplimiento al 100%
                    </DialogTitle>
                    <DialogDescription>
                        Estos empleados han completado todos sus cursos obligatorios.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Puesto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empleadosCertificados.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell>
                                        <div className="font-medium">{emp.nombre_completo}</div>
                                        <div className="text-xs text-muted-foreground">ID: {emp.id_empleado}</div>
                                    </TableCell>
                                    <TableCell>{emp.puesto}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        {/* Modal Empleados Criticos */}
        <Dialog open={isCriticosModalOpen} onOpenChange={setIsCriticosModalOpen}>
            <DialogContent className="sm:max-w-2xl rounded-2xl bg-card">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-400" />
                        Personal en Estado Crítico
                    </DialogTitle>
                    <DialogDescription>
                        Empleados con cumplimiento muy bajo o sin perfil de capacitación definido.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-96 mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Puesto</TableHead>
                                <TableHead>Estatus</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empleadosCriticos.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell>
                                        <div className="font-medium">{emp.nombre_completo}</div>
                                        <div className="text-xs text-muted-foreground">ID: {emp.id_empleado}</div>
                                    </TableCell>
                                    <TableCell>{emp.puesto}</TableCell>
                                    <TableCell>
                                        <Badge variant={emp.estatus === 'CRÍTICO' ? 'destructive' : 'secondary'}>
                                            {emp.estatus.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </DialogContent>
        </Dialog>

    </div>
  );
}
