
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarPlus, Loader2, Save, BookCopy, Search, TrendingUp, CheckCircle, XCircle, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { motion, Variants } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';


// --- Interfaces ---
interface PlanFormacion {
  id: string; // Document ID
  id_registro: string;
  nombre_empleado: string;
  area: string;
  departamento: string;
  mes_auditable: string;
  estatus: 'ENTREGADO' | 'SIN ENTREGAR';
}

interface GrupoMes {
  mes: string;
  planes: PlanFormacion[];
  total: number;
  entregados: number;
  cumplimiento: number;
}

interface CumplimientoDepartamento {
    departamento: string;
    cumplimientoAnual: number;
    meses: {
        mes: string;
        cumplimiento: number;
    }[];
}


const MESES_ORDENADOS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

// --- Componente de Tarjeta de Mes ---
const MonthCard = ({ mes, anio, planes, cumplimiento, onPlanificar, isLoading }: { mes: string, anio: number, planes: PlanFormacion[], cumplimiento: number, onPlanificar: () => void, isLoading: boolean }) => {
    
    const handleStatusChange = (plan: PlanFormacion, checked: boolean) => {
        // La lógica para cambiar el estatus se manejará en el diálogo principal.
        // Esta llamada simplemente abre el diálogo para que el usuario confirme/edite.
        onPlanificar();
    };
    
    return (
    <motion.div variants={itemVariants} whileHover={{y: -5}} className="h-full">
        <Collapsible key={mes} className="border rounded-lg bg-card/80 shadow-sm h-full flex flex-col">
            <div className="p-4 flex-1">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{mes}</h3>
                    <Badge variant={cumplimiento >= 65 ? 'default' : 'destructive'} className={cn(cumplimiento >= 65 && 'bg-green-600')}>
                        {planes.filter(p => p.estatus === 'ENTREGADO').length}/{planes.length} Entregados
                    </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <Progress value={cumplimiento} indicatorClassName={cn(cumplimiento >= 65 ? 'bg-green-500' : 'bg-destructive')} className="h-2" />
                    <span className="text-xs font-bold">{cumplimiento.toFixed(0)}%</span>
                </div>
            </div>
            <CollapsibleContent>
                <div className="border-t">
                    <ScrollArea className="h-72">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Empleado</TableHead>
                                    <TableHead className="text-right">Estatus</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {planes.length > 0 ? (
                                planes.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell className="font-mono text-xs">{plan.id_registro}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-sm">{plan.nombre_empleado}</div>
                                        <div className="text-xs text-muted-foreground">{plan.departamento}</div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Switch
                                            checked={plan.estatus === 'ENTREGADO'}
                                            onCheckedChange={(checked) => handleStatusChange(plan, checked)}
                                        />
                                    </TableCell>
                                </TableRow>
                                ))
                                ) : (<TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">No hay registros para este mes.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CollapsibleContent>
            <CardFooter className="p-2 border-t">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full text-xs">Ver Detalles</Button>
                </CollapsibleTrigger>
            </CardFooter>
        </Collapsible>
    </motion.div>
    );
};


// --- Componente Principal ---
export default function FormacionPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');

  const formacionRef = useMemoFirebase(() => collection(firestore, 'plan_formacion'), [firestore]);
  const { data: planes, isLoading: loadingPlanes } = useCollection<PlanFormacion>(formacionRef);

  const isLoading = loadingPlanes;

  const datosAgrupados = useMemo(() => {
    if (!planes) return [];

    const grupos: Record<string, PlanFormacion[]> = {};

    planes.forEach(plan => {
      const mes = plan.mes_auditable || 'SIN MES';
      if (!grupos[mes]) {
        grupos[mes] = [];
      }
      grupos[mes].push(plan);
    });

    return MESES_ORDENADOS
      .map(mes => {
        const planesDelMes = grupos[mes] || [];
        const entregados = planesDelMes.filter(p => p.estatus === 'ENTREGADO').length;
        const total = planesDelMes.length;
        return {
          mes,
          planes: planesDelMes.sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nombre_empleado.localeCompare(b.nombre_empleado)),
          total,
          entregados,
          cumplimiento: total > 0 ? (entregados / total) * 100 : 0,
        };
      }).filter(grupo => grupo.total > 0);
  }, [planes]);

  const filteredDatosAgrupados = useMemo(() => {
    if (!searchQuery) return datosAgrupados;
    const queryLower = searchQuery.toLowerCase();

    return datosAgrupados.map(grupo => {
        const planesFiltrados = grupo.planes.filter(plan =>
            plan.nombre_empleado.toLowerCase().includes(queryLower) ||
            plan.departamento.toLowerCase().includes(queryLower) ||
            plan.area.toLowerCase().includes(queryLower) ||
            plan.id_registro.toLowerCase().includes(queryLower)
        );
        return { ...grupo, planes: planesFiltrados };
    }).filter(grupo => grupo.planes.length > 0);
  }, [datosAgrupados, searchQuery]);
  
  const analisisPorDepartamento = useMemo((): CumplimientoDepartamento[] => {
    if (!planes) return [];

    const porDepto: Record<string, { [mes: string]: { total: number; entregados: number } }> = {};

    planes.forEach(plan => {
        const depto = plan.departamento || "SIN DEPARTAMENTO";
        const mes = plan.mes_auditable;

        if (!porDepto[depto]) porDepto[depto] = {};
        if (!porDepto[depto][mes]) porDepto[depto][mes] = { total: 0, entregados: 0 };
        
        porDepto[depto][mes].total++;
        if (plan.estatus === 'ENTREGADO') {
            porDepto[depto][mes].entregados++;
        }
    });
    
    return Object.keys(porDepto).sort().map(depto => {
        let sumaDeCumplimientosMensuales = 0;
        let mesesConActividad = 0;
        
        const meses = MESES_ORDENADOS.map(mes => {
            const dataMes = porDepto[depto][mes];
            if (!dataMes || dataMes.total === 0) {
              return { mes, cumplimiento: 0 };
            }
            
            const cumplimientoMes = (dataMes.entregados / dataMes.total) * 100;
            sumaDeCumplimientosMensuales += cumplimientoMes;
            mesesConActividad++;

            return { mes, cumplimiento: cumplimientoMes };
        });

        const cumplimientoAnual = mesesConActividad > 0 ? (sumaDeCumplimientosMensuales / mesesConActividad) : 0;
        
        return { departamento: depto, cumplimientoAnual, meses };
    });

  }, [planes]);

  const kpisGenerales = useMemo(() => {
    if (!planes) return { anual: 0, total: 0, entregados: 0, pendientes: 0 };
    const total = planes.length;
    const entregados = planes.filter(p => p.estatus === 'ENTREGADO').length;
    return {
        anual: total > 0 ? (entregados / total) * 100 : 0,
        total,
        entregados,
        pendientes: total - entregados
    };
  }, [planes]);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold tracking-tight">Plan de Formación Anual</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seguimiento del cumplimiento de entrega de planes de formación auditables.
        </p>
      </motion.div>

       <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={itemVariants} className="h-full">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cumplimiento Anual</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpisGenerales.anual.toFixed(1)}%</div>
                        <Progress value={kpisGenerales.anual} className="h-2 mt-2"/>
                    </CardContent>
                </Card>
            </motion.div>
             <motion.div variants={itemVariants} className="h-full">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Planes Totales</CardTitle>
                        <BookCopy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpisGenerales.total}</div>
                    </CardContent>
                </Card>
            </motion.div>
             <motion.div variants={itemVariants} className="h-full">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpisGenerales.entregados}</div>
                    </CardContent>
                </Card>
            </motion.div>
             <motion.div variants={itemVariants} className="h-full">
                <Card className="h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{kpisGenerales.pendientes}</div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
            <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                <CardTitle>Progreso por Mes</CardTitle>
                <CardDescription>
                    Busca y despliega el detalle de los planes de formación para cada mes.
                </CardDescription>
                </div>
                <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ID, Empleado, depto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
                </div>
            </div>
            </CardHeader>
            <CardContent>
            {isLoading ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Cargando datos de formación...</p>
                </motion.div>
            ) : (
                <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDatosAgrupados.map(grupo => (
                       <MonthCard 
                            key={grupo.mes}
                            mes={grupo.mes}
                            anio={2026}
                            planes={grupo.planes}
                            cumplimiento={grupo.cumplimiento}
                            onPlanificar={()=>{}}
                            isLoading={isLoading}
                        />
                    ))}
                </motion.div>
            )}
            </CardContent>
        </Card>
      </motion.div>

       <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><Building className="h-6 w-6 text-primary"/>Cumplimiento por Departamento</CardTitle>
                <CardDescription>Análisis anual y mensual del rendimiento de cada departamento.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {analisisPorDepartamento.map(depto => (
                        <AccordionItem value={depto.departamento} key={depto.departamento} className="border rounded-lg bg-card/80">
                            <AccordionTrigger className="px-6 py-4 font-medium text-lg hover:no-underline rounded-t-lg">
                                <div className="flex justify-between items-center w-full">
                                    <span>{depto.departamento}</span>
                                    <Badge variant={depto.cumplimientoAnual >= 65 ? 'default' : 'destructive'} className={cn(depto.cumplimientoAnual >= 65 && 'bg-green-600')}>
                                       Anual: {depto.cumplimientoAnual.toFixed(1)}%
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {depto.meses.map(mes => (
                                        <div key={mes.mes} className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">{mes.mes}</p>
                                            <div className="flex items-center gap-2">
                                                <Progress value={mes.cumplimiento} indicatorClassName={cn(mes.cumplimiento >= 65 ? 'bg-green-500' : 'bg-destructive')} className="h-1.5" />
                                                <span className="text-xs font-bold">{mes.cumplimiento.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
