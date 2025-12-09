
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarPlus, Loader2, Save, BookCopy, Search, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
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

const MESES_ORDENADOS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

// --- Componente de Tarjeta de Mes ---
const MonthCard = ({ mes, anio, cursosPlaneados, onPlanificar, isLoading }: { mes: string, anio: number, cursosPlaneados: PlanFormacion[], onPlanificar: () => void, isLoading: boolean }) => (
    <motion.div whileHover={{ y: -5 }} className="h-full">
        <Card className="flex flex-col h-full rounded-2xl shadow-md border-border/50 bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">{mes}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {isLoading ? <div className="text-center p-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground"/></div> :
                cursosPlaneados.length > 0 ? (
                    <ScrollArea className="h-40">
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            {cursosPlaneados.map(curso => <li key={curso.id}>{curso.nombre_empleado}</li>)}
                        </ul>
                    </ScrollArea>
                ) : (
                    <div className="flex h-full items-center justify-center text-center">
                        <p className="text-sm text-muted-foreground italic">Aún no hay cursos planeados.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={onPlanificar}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Planificar Cursos
                </Button>
            </CardFooter>
        </Card>
    </motion.div>
);


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


  const handleStatusChange = async (plan: PlanFormacion, nuevoEstatus: boolean) => {
    if (!firestore) return;
    
    const docRef = doc(firestore, 'plan_formacion', plan.id);
    const estatusString = nuevoEstatus ? 'ENTREGADO' : 'SIN ENTREGAR';

    try {
        await setDocumentNonBlocking(docRef, { estatus: estatusString }, { merge: true });
        toast({
            title: `Estatus Actualizado`,
            description: `${plan.nombre_empleado} ahora está como ${estatusString}.`,
        });
    } catch (error) {
        console.error("Error al actualizar estatus:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo actualizar el estatus.",
        });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Plan de Formación Anual</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seguimiento del cumplimiento de entrega de planes de formación auditables.
        </p>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cumplimiento Anual</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{kpisGenerales.anual.toFixed(1)}%</div>
                    <Progress value={kpisGenerales.anual} className="h-2 mt-2"/>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Planes Totales</CardTitle>
                    <BookCopy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{kpisGenerales.total}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Entregados</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{kpisGenerales.entregados}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{kpisGenerales.pendientes}</div>
                </CardContent>
            </Card>
        </div>

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
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando datos de formación...</p>
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDatosAgrupados.map(grupo => (
                    <Collapsible key={grupo.mes} className="border rounded-lg bg-card/80 shadow-sm">
                        <div className="p-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{grupo.mes}</h3>
                                <Badge variant={grupo.cumplimiento >= 65 ? 'default' : 'destructive'} className={cn(grupo.cumplimiento >= 65 && 'bg-green-600')}>
                                    {grupo.entregados}/{grupo.total} Entregados
                                </Badge>
                            </div>
                             <div className="flex items-center gap-2 mt-2">
                                <Progress value={grupo.cumplimiento} indicatorClassName={cn(grupo.cumplimiento >= 65 ? 'bg-green-500' : 'bg-destructive')} className="h-2" />
                                <span className="text-xs font-bold">{grupo.cumplimiento.toFixed(0)}%</span>
                            </div>
                        </div>
                        <CollapsibleContent>
                            <div className="border-t">
                                <ScrollArea className="h-72">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                            <TableRow>
                                                <TableHead>ID Empleado</TableHead>
                                                <TableHead>Empleado</TableHead>
                                                <TableHead className="text-right">Estatus</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grupo.planes.map(plan => (
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
                                            ))}
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
                ))}
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
