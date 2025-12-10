
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Edit, Save, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRoleCheck } from '@/hooks/use-role-check';
import { motion } from 'framer-motion';

interface ReglaAscenso {
    id: string;
    puesto_actual: string;
    puesto_siguiente: string;
    meses_minimos: number;
    min_evaluacion_desempeno: number;
    min_examen_teorico?: number;
    min_cobertura_matriz: number;
    orden_jerarquico: number;
}

const initialRuleState: Omit<ReglaAscenso, 'id' | 'fecha_actualizacion'> = {
    puesto_actual: '',
    puesto_siguiente: '',
    meses_minimos: 0,
    min_evaluacion_desempeno: 80,
    min_examen_teorico: 0,
    min_cobertura_matriz: 0,
    orden_jerarquico: 1
};


export default function PlanDeCarreraPage() {
    const firestore = useFirestore();
    const { isAdmin, checkAdminAndExecute } = useRoleCheck();
    const { toast } = useToast();

    const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);
    const { data: reglasAscenso, isLoading } = useCollection<ReglaAscenso>(reglasAscensoRef);

    const [editingRule, setEditingRule] = useState<ReglaAscenso | Omit<ReglaAscenso, 'id'> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isNew, setIsNew] = useState(false);

    const groupedRules = useMemo(() => {
        if (!reglasAscenso) return {};
        const groups: Record<string, ReglaAscenso[]> = {};

        const getBaseJob = (puesto: string) => {
          const match = puesto.match(/^(.*)\s[A-E]$/);
          return match ? match[1] : puesto;
        };

        reglasAscenso.forEach(regla => {
            const baseJob = getBaseJob(regla.puesto_actual);
            if (!groups[baseJob]) groups[baseJob] = [];
            groups[baseJob].push(regla);
        });

        for (const job in groups) {
            groups[job].sort((a, b) => (b.orden_jerarquico || 0) - (a.orden_jerarquico || 0));
        }

        return groups;
    }, [reglasAscenso]);

    const handleEditClick = (rule: ReglaAscenso) => {
        checkAdminAndExecute(() => {
            setIsNew(false);
            setEditingRule({ ...rule });
        });
    };

    const handleNewClick = () => {
        checkAdminAndExecute(() => {
            setIsNew(true);
            setEditingRule({ ...initialRuleState });
        });
    }

    const handleSave = async () => {
        if (!editingRule) return;
        
        checkAdminAndExecute(async () => {
            setIsSaving(true);
            const slugify = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
            const docId = isNew ? slugify(editingRule.puesto_actual) : (editingRule as ReglaAscenso).id;

            if(!docId) {
                toast({ variant: 'destructive', title: 'Error', description: 'El Puesto Actual es obligatorio para crear una regla.'});
                setIsSaving(false);
                return;
            }

            const docRef = doc(firestore, 'reglas_ascenso', docId);
            
            const dataToSave = {
                ...editingRule,
                meses_minimos: Number(editingRule.meses_minimos),
                min_evaluacion_desempeno: Number(editingRule.min_evaluacion_desempeno),
                min_examen_teorico: Number(editingRule.min_examen_teorico),
                min_cobertura_matriz: Number(editingRule.min_cobertura_matriz),
                orden_jerarquico: Number(editingRule.orden_jerarquico),
                fecha_actualizacion: serverTimestamp()
            };
            
            // Remove ID if it's part of the object we are saving
            if('id' in dataToSave) delete (dataToSave as any).id;

            try {
                await setDoc(docRef, dataToSave, { merge: true });
                toast({ title: "¡Éxito!", description: `Regla para "${editingRule.puesto_actual}" guardada correctamente.`, className: "bg-green-100 text-green-800" });
                setEditingRule(null);
            } catch (error) {
                console.error("Error al guardar:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la regla.' });
            } finally {
                setIsSaving(false);
            }
        });
    };

    const handleFieldChange = (field: keyof Omit<ReglaAscenso, 'id'>, value: string) => {
        if (!editingRule) return;
        setEditingRule(prev => prev ? { ...prev, [field]: value } : null);
    }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight">Plan de Carrera y Promociones</h1>
            <p className="mt-2 text-lg text-muted-foreground">
            Consulta los criterios y requisitos necesarios para los cambios de categoría en cada puesto.
            </p>
        </div>
        {isAdmin && (
            <Button onClick={handleNewClick}>
                <PlusCircle className="mr-2 h-4 w-4"/>
                Crear Nueva Regla
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lógica de Promociones por Puesto</CardTitle>
          <CardDescription>
            Aquí se detalla el plan de carrera para cada puesto con categorías. La información se obtiene en tiempo real de la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin"/></div> :
            <Accordion type="single" collapsible className="w-full space-y-4">
              {Object.entries(groupedRules).sort(([jobA], [jobB]) => jobA.localeCompare(jobB)).map(([puestoBase, reglas]) => (
                <AccordionItem value={puestoBase} key={puestoBase} className="border rounded-lg bg-card hover:bg-muted/30">
                  <AccordionTrigger className="px-6 py-4 text-lg font-medium hover:no-underline rounded-t-lg">
                    {puestoBase}
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría Actual</TableHead>
                            <TableHead>Promoción a</TableHead>
                            <TableHead>Tiempo Mín.</TableHead>
                            <TableHead>Eval. Desempeño</TableHead>
                            <TableHead>Examen Teórico</TableHead>
                            <TableHead>% Cobertura Matriz</TableHead>
                            {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reglas.map((regla) => {
                            const categoriaActualMatch = regla.puesto_actual.match(/\s([A-E])$/);
                            const categoriaActual = categoriaActualMatch ? categoriaActualMatch[1] : 'N/A';

                            const categoriaSiguienteMatch = regla.puesto_siguiente.match(/\s([A-E])$/);
                            const categoriaSiguiente = categoriaSiguienteMatch ? categoriaSiguienteMatch[1] : regla.puesto_siguiente;

                            return (
                                <TableRow key={regla.id}>
                                <TableCell><Badge variant="secondary" className="font-semibold text-base">{categoriaActual}</Badge></TableCell>
                                <TableCell>
                                    {regla.puesto_siguiente === "Máxima Categoría" ? 
                                        (<Badge variant="default" className="bg-green-500">{regla.puesto_siguiente}</Badge>) : 
                                        (<Badge variant="outline" className="font-semibold text-base border-primary/50 text-primary">{categoriaSiguiente}</Badge>)
                                    }
                                </TableCell>
                                <TableCell>{regla.meses_minimos} meses</TableCell>
                                <TableCell>{regla.min_evaluacion_desempeno}</TableCell>
                                <TableCell>{regla.min_examen_teorico ? `≥${regla.min_examen_teorico}%` : 'N/A'}</TableCell>
                                <TableCell>≥{regla.min_cobertura_matriz}%</TableCell>
                                {isAdmin && <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleEditClick(regla)}><Edit className="h-4 w-4"/></Button></TableCell>}
                                </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          }
        </CardContent>
      </Card>
      
      {editingRule && (
        <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isNew ? 'Crear Nueva Regla de Ascenso' : `Editando: ${editingRule.puesto_actual}`}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="puesto_actual">Puesto Actual</Label>
                        <Input id="puesto_actual" value={editingRule.puesto_actual} onChange={e => handleFieldChange('puesto_actual', e.target.value)} disabled={!isNew}/>
                    </div>
                    <div className="space-y-2 col-span-1">
                        <Label htmlFor="puesto_siguiente">Puesto Siguiente</Label>
                        <Input id="puesto_siguiente" value={editingRule.puesto_siguiente} onChange={e => handleFieldChange('puesto_siguiente', e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="meses_minimos">Meses Mínimos de Antigüedad</Label>
                        <Input id="meses_minimos" type="number" value={editingRule.meses_minimos} onChange={e => handleFieldChange('meses_minimos', e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="min_evaluacion_desempeno">Mín. Evaluación Desempeño</Label>
                        <Input id="min_evaluacion_desempeno" type="number" value={editingRule.min_evaluacion_desempeno} onChange={e => handleFieldChange('min_evaluacion_desempeno', e.target.value)}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="min_examen_teorico">Mín. Examen Teórico (%)</Label>
                        <Input id="min_examen_teorico" type="number" value={editingRule.min_examen_teorico || ''} onChange={e => handleFieldChange('min_examen_teorico', e.target.value)} placeholder="Opcional"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="min_cobertura_matriz">Mín. Cobertura Matriz (%)</Label>
                        <Input id="min_cobertura_matriz" type="number" value={editingRule.min_cobertura_matriz} onChange={e => handleFieldChange('min_cobertura_matriz', e.target.value)}/>
                    </div>
                     <div className="space-y-2 col-span-2">
                        <Label htmlFor="orden_jerarquico">Orden Jerárquico (Mayor es más alto)</Label>
                        <Input id="orden_jerarquico" type="number" value={editingRule.orden_jerarquico} onChange={e => handleFieldChange('orden_jerarquico', e.target.value)}/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingRule(null)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
