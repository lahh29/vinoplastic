
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

export default function FormacionPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const formacionRef = useMemoFirebase(() => collection(firestore, 'plan_formacion'), [firestore]);
  const { data: planes, isLoading } = useCollection<PlanFormacion>(formacionRef);

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
      .filter(mes => grupos[mes]) // Solo incluir meses que tienen datos
      .map(mes => {
        const planesDelMes = grupos[mes];
        const entregados = planesDelMes.filter(p => p.estatus === 'ENTREGADO').length;
        const total = planesDelMes.length;
        return {
          mes,
          planes: planesDelMes.sort((a, b) => a.departamento.localeCompare(b.departamento) || a.nombre_empleado.localeCompare(b.nombre_empleado)),
          total,
          entregados,
          cumplimiento: total > 0 ? (entregados / total) * 100 : 0,
        };
      });
  }, [planes]);

  const handleStatusChange = async (plan: PlanFormacion, nuevoEstatus: boolean) => {
    if (!firestore) return;
    
    const docRef = doc(firestore, 'plan_formacion', plan.id);
    const estatusString = nuevoEstatus ? 'ENTREGADO' : 'SIN ENTREGAR';

    // Optimistic UI update (optional but good for UX)
    // This part would require more complex state management, so we'll rely on Firestore's real-time update for now.

    try {
        setDocumentNonBlocking(docRef, { estatus: estatusString }, { merge: true });
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
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Plan de Formación Anual</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Seguimiento del cumplimiento de entrega de planes de formación auditables.
        </p>
      </div>

      <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Cumplimiento por Mes</CardTitle>
          <CardDescription>
            Haz clic en un mes para ver el detalle de los planes de formación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando datos de formación...</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {datosAgrupados.map(grupo => (
                <AccordionItem value={grupo.mes} key={grupo.mes} className="border-b-0 rounded-lg bg-card/80 border shadow-sm">
                  <AccordionTrigger className="px-6 py-4 text-lg font-medium hover:no-underline rounded-t-lg">
                    <div className="flex items-center gap-4 w-full">
                        <CalendarCheck className="h-6 w-6 text-primary" />
                        <span className="flex-1 text-left">{grupo.mes.charAt(0).toUpperCase() + grupo.mes.slice(1).toLowerCase()}</span>
                        <div className="flex items-center gap-3 w-48">
                            <Progress value={grupo.cumplimiento} className="h-3" />
                            <span className={cn("font-bold text-sm", grupo.cumplimiento > 80 ? "text-green-500" : "text-amber-500")}>
                                {grupo.cumplimiento.toFixed(0)}%
                            </span>
                        </div>
                         <ChevronsUpDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground group-data-[state=open]:-rotate-180" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Empleado</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead>Área</TableHead>
                              <TableHead className="text-center w-40">Estatus</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupo.planes.map(plan => (
                              <TableRow key={plan.id}>
                                <TableCell className="font-medium">{plan.nombre_empleado}</TableCell>
                                <TableCell>{plan.departamento}</TableCell>
                                <TableCell className="text-muted-foreground">{plan.area}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <Switch
                                        id={`switch-${plan.id}`}
                                        checked={plan.estatus === 'ENTREGADO'}
                                        onCheckedChange={(checked) => handleStatusChange(plan, checked)}
                                    />
                                    <Label htmlFor={`switch-${plan.id}`}>
                                        <Badge variant={plan.estatus === 'ENTREGADO' ? 'default' : 'destructive'} className={cn(plan.estatus === 'ENTREGADO' && 'bg-green-600')}>
                                            {plan.estatus}
                                        </Badge>
                                    </Label>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
