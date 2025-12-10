
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileClock, Search, Calendar, Star, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, Timestamp, setDoc } from 'firebase/firestore';
import { format, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRoleCheck } from '@/hooks/use-role-check';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface ContratoFechas {
  ingreso: Timestamp;
  termino: Timestamp;
}

interface EvaluacionDetalle {
    fecha_programada: Timestamp;
    calificacion_texto: string;
    calificacion_valor: number | null;
    estatus: string;
}

interface ContratoEvaluaciones {
    primera: EvaluacionDetalle;
    segunda: EvaluacionDetalle;
    tercera: EvaluacionDetalle;
}

interface Empleado {
    id: string;
    id_empleado: string;
    nombre_completo: string;
    puesto: {
        titulo: string;
        departamento: string;
    };
    fecha_ingreso?: Timestamp;
}

interface Contrato {
  id: string; // Document ID from Firestore
  id_empleado: string;
  nombre_completo: string;
  departamento: string;
  fechas_contrato: ContratoFechas;
  evaluaciones: ContratoEvaluaciones;
  indeterminado?: boolean;
  fecha_ingreso_plantilla?: Timestamp; // Campo fusionado
}

const getDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    // Handle cases where the date might be a string or number from older data structures
    const date = new Date(timestamp);
    return isValid(date) ? date : null;
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  const date = getDate(timestamp);
  if (!date || !isValid(date)) return 'N/A';
  return format(date, 'dd/MMM/yy', { locale: es });
};


export default function ContratosPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { checkAdminAndExecute } = useRoleCheck();
  const contratosRef = useMemoFirebase(() => firestore ? collection(firestore, 'Contratos') : null, [firestore]);
  const plantillaRef = useMemoFirebase(() => firestore ? collection(firestore, 'Plantilla') : null, [firestore]);

  const { data: contratos, isLoading: loadingContratos } = useCollection<Contrato>(contratosRef);
  const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
  
  const isLoading = loadingContratos || loadingEmpleados;

  const contratosFusionados = useMemo(() => {
    if (isLoading || !contratos || !empleados) return [];
    
    const empleadosMap = new Map(empleados.map(e => [e.id_empleado, e]));

    return contratos
      .filter(c => empleadosMap.has(c.id_empleado)) // Solo contratos de empleados existentes
      .map(c => {
        const empleadoData = empleadosMap.get(c.id_empleado);
        return {
          ...c,
          fecha_ingreso_plantilla: empleadoData?.fecha_ingreso || c.fechas_contrato.ingreso,
        };
      });
  }, [contratos, empleados, isLoading]);

  const [searchTerm, setSearchTerm] = useState('');
  const [expiringContracts, setExpiringContracts] = useState<Contrato[]>([]);
  const [dueEvaluations, setDueEvaluations] = useState<{contrato: Contrato, fecha: string, tipo: string}[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null);
  const [evaluations, setEvaluations] = useState({ eval1: '', eval2: '', eval3: '' });
  const [calculatedDates, setCalculatedDates] = useState<{ eval1: Date | null; eval2: Date | null; eval3: Date | null; termino: Date | null; }>({ eval1: null, eval2: null, eval3: null, termino: null });
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!contratosFusionados) return;

    const today = new Date();
    const fifteenDaysFromNow = addDays(today, 15);
    const sevenDaysFromNow = addDays(today, 7);

    const expiring = contratosFusionados.filter(c => {
        if (c.indeterminado) return false;
        const termDate = getDate(c.fechas_contrato?.termino);
        return termDate && termDate >= today && termDate <= fifteenDaysFromNow;
    });
    
    const evaluationsDue: {contrato: Contrato, fecha: string, tipo: string}[] = [];
    contratosFusionados.forEach(c => {
        if (!c.evaluaciones) return;
        const eval1Date = getDate(c.evaluaciones.primera?.fecha_programada);
        const eval2Date = getDate(c.evaluaciones.segunda?.fecha_programada);
        const eval3Date = getDate(c.evaluaciones.tercera?.fecha_programada);

        if (eval1Date && eval1Date >= today && eval1Date <= sevenDaysFromNow && c.evaluaciones.primera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.primera.fecha_programada), tipo: 'Primera' });
        }
        if (eval2Date && eval2Date >= today && eval2Date <= sevenDaysFromNow && c.evaluaciones.segunda.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.segunda.fecha_programada), tipo: 'Segunda' });
        }
        if (eval3Date && eval3Date >= today && eval3Date <= sevenDaysFromNow && c.evaluaciones.tercera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.tercera.fecha_programada), tipo: 'Tercera' });
        }
    });

    setExpiringContracts(expiring.sort((a,b) => (getDate(a.fechas_contrato.termino)?.getTime() ?? 0) - (getDate(b.fechas_contrato.termino)?.getTime() ?? 0)));
    setDueEvaluations(evaluationsDue.sort((a,b) => (getDate(a.contrato.evaluaciones?.primera?.fecha_programada) ?? new Date(0)).getTime() - (getDate(b.contrato.evaluaciones?.primera?.fecha_programada) ?? new Date(0)).getTime()));
  }, [contratosFusionados]);

  const { determinados, indeterminados } = useMemo(() => {
    if (!contratosFusionados) return { determinados: [], indeterminados: [] };

    const search = searchTerm.toLowerCase();
    const filtered = contratosFusionados.filter((contrato: Contrato) => {
        if (!contrato.id_empleado || !contrato.nombre_completo) return false;
        return (
            contrato.id_empleado.toLowerCase().includes(search) ||
            contrato.nombre_completo.toLowerCase().includes(search)
        );
    });

    return {
      determinados: filtered.filter(c => !c.indeterminado),
      indeterminados: filtered.filter(c => c.indeterminado),
    };

  }, [contratosFusionados, searchTerm]);
  
  const handleRowClick = (contrato: Contrato) => {
    checkAdminAndExecute(() => {
        setSelectedContract(contrato);
        setEvaluations({
            eval1: contrato.evaluaciones?.primera?.calificacion_texto || 'Pendiente',
            eval2: contrato.evaluaciones?.segunda?.calificacion_texto || 'Pendiente',
            eval3: contrato.evaluaciones?.tercera?.calificacion_texto || 'Pendiente',
        });
        setIsIndeterminate(contrato.indeterminado || false);

        const ingresoDate = getDate(contrato.fecha_ingreso_plantilla);
        if(ingresoDate) {
            setCalculatedDates({
                eval1: addDays(ingresoDate, 30),
                eval2: addDays(ingresoDate, 60),
                eval3: addDays(ingresoDate, 80),
                termino: addDays(ingresoDate, 89)
            });
        }
    });
  };

 const handleSave = () => {
    checkAdminAndExecute(async () => {
      if (!selectedContract || !firestore) return;
      setIsSaving(true);
      const docRef = doc(firestore, 'Contratos', selectedContract.id);
      
      const updatedData = { ...selectedContract };

      const parseScore = (score: string) => score.includes('%') ? parseFloat(score.replace('%','')) : (isNaN(parseFloat(score)) ? null : parseFloat(score));
      
      updatedData.evaluaciones.primera.calificacion_texto = evaluations.eval1;
      updatedData.evaluaciones.primera.calificacion_valor = parseScore(evaluations.eval1);
      updatedData.evaluaciones.primera.estatus = (evaluations.eval1 === 'Pendiente' || evaluations.eval1 === '') ? 'Pendiente' : 'Evaluado';
      
      updatedData.evaluaciones.segunda.calificacion_texto = evaluations.eval2;
      updatedData.evaluaciones.segunda.calificacion_valor = parseScore(evaluations.eval2);
      updatedData.evaluaciones.segunda.estatus = (evaluations.eval2 === 'Pendiente' || evaluations.eval2 === '') ? 'Pendiente' : 'Evaluado';

      updatedData.evaluaciones.tercera.calificacion_texto = evaluations.eval3;
      updatedData.evaluaciones.tercera.calificacion_valor = parseScore(evaluations.eval3);
      updatedData.evaluaciones.tercera.estatus = (evaluations.eval3 === 'Pendiente' || evaluations.eval3 === '') ? 'Pendiente' : 'Evaluado';
      
      updatedData.indeterminado = isIndeterminate;

      delete (updatedData as any).id;
      delete (updatedData as any).fecha_ingreso_plantilla;
      
      try {
        await setDoc(docRef, updatedData, { merge: true });
        toast({
          title: "Éxito",
          description: `El contrato de ${selectedContract.nombre_completo} ha sido actualizado.`,
          className: "bg-green-100 text-green-800 border-green-300",
        })
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el contrato.",
          variant: 'destructive',
        })
      } finally {
        setIsSaving(false);
        setSelectedContract(null);
      }
    });
  };
  
  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
    >
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Gestión de Contratos</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Supervisa vencimientos, evaluaciones y desempeño del personal.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="rounded-2xl shadow-lg border-destructive/20 bg-card/60 backdrop-blur-sm" data-tour="contratos-vencer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-semibold">Contratos por Vencer</CardTitle>
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">En los próximos 15 días.</p>
                <ScrollArea className="h-48">
                {expiringContracts.length > 0 ? (
                    <div className="space-y-3 pr-4">
                        {expiringContracts.map(c => (
                            <motion.div whileHover={{ scale: 1.02}} key={c.id} className="p-3 bg-card/60 border-l-4 border-destructive rounded-r-lg shadow-sm">
                                <p className="font-semibold text-sm">{c.nombre_completo}</p>
                                <p className="text-xs text-destructive">Vence el: {formatDate(c.fechas_contrato?.termino)}</p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground italic">No hay contratos por vencer.</p></div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-lg border-primary/20 bg-card/60 backdrop-blur-sm" data-tour="contratos-evaluaciones">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-semibold">Evaluaciones Próximas</CardTitle>
                <FileClock className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">En los próximos 7 días.</p>
                 <ScrollArea className="h-48">
                 {dueEvaluations.length > 0 ? (
                    <div className="space-y-3 pr-4">
                        {dueEvaluations.map(item => (
                             <motion.div whileHover={{ scale: 1.02}} key={item.contrato.id + item.tipo} className="p-3 bg-card/60 border-l-4 border-primary rounded-r-lg shadow-sm">
                                <p className="font-semibold text-sm">{item.contrato.nombre_completo}</p>
                                <p className="text-xs text-primary">
                                   {item.tipo} evaluación antes del: {item.fecha}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground italic">No hay evaluaciones próximas.</p></div>
                )}
                </ScrollArea>
            </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-lg bg-card/60 backdrop-blur-sm" data-tour="contratos-tabla">
        <CardHeader>
          <CardTitle>Listado de Personal</CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando contratos...' : 'Busca y selecciona un empleado para ver o actualizar sus evaluaciones.'}
          </CardDescription>
          <div className="relative pt-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="determinados">
              <TabsList>
                <TabsTrigger value="determinados">Determinados ({determinados.length})</TabsTrigger>
                <TabsTrigger value="indeterminados">Indeterminados ({indeterminados.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="determinados" className="mt-4">
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead>Ingreso</TableHead><TableHead>Vencimiento</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {determinados.map((contrato) => (
                        <TableRow key={contrato.id} onClick={() => handleRowClick(contrato)} className="cursor-pointer hover:bg-accent/50 transition-colors">
                            <TableCell>{contrato.id_empleado}</TableCell>
                            <TableCell className="font-medium">{contrato.nombre_completo}</TableCell>
                            <TableCell>{formatDate(contrato.fecha_ingreso_plantilla)}</TableCell>
                            <TableCell>{formatDate(contrato.fechas_contrato?.termino)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
              </TabsContent>
              <TabsContent value="indeterminados" className="mt-4">
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                    <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nombre</TableHead><TableHead>Ingreso</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {indeterminados.map((contrato) => (
                        <TableRow key={contrato.id} onClick={() => handleRowClick(contrato)} className="cursor-pointer hover:bg-accent/50 transition-colors">
                            <TableCell>{contrato.id_empleado}</TableCell>
                            <TableCell className="font-medium">{contrato.nombre_completo}</TableCell>
                            <TableCell>{formatDate(contrato.fecha_ingreso_plantilla)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
            <DialogContent className="sm:max-w-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Seguimiento de Evaluaciones</DialogTitle>
                    <DialogDescription className="text-base">
                        {selectedContract.nombre_completo} (ID: {selectedContract.id_empleado})
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-6">
                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Star className="text-amber-400"/> Evaluaciones de Desempeño</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="eval1" className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar size={16}/> 1ra Evaluación ({formatDate(calculatedDates.eval1)})
                                </Label>
                                <Input
                                    id="eval1"
                                    value={evaluations.eval1}
                                    onChange={(e) => setEvaluations({...evaluations, eval1: e.target.value})}
                                    placeholder="Ej: 95%"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eval2" className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar size={16}/> 2da Evaluación ({formatDate(calculatedDates.eval2)})
                                </Label>
                                <Input
                                    id="eval2"
                                    value={evaluations.eval2}
                                    onChange={(e) => setEvaluations({...evaluations, eval2: e.target.value})}
                                    placeholder="Ej: 95%"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="eval3" className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar size={16}/> 3ra Evaluación ({formatDate(calculatedDates.eval3)})
                                </Label>
                                <Input
                                    id="eval3"
                                    value={evaluations.eval3}
                                    onChange={(e) => setEvaluations({...evaluations, eval3: e.target.value})}
                                    placeholder="Ej: 95%"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-lg border p-4">
                       <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp className="text-green-500"/> Estatus del Contrato</h3>
                       <div className="flex items-center space-x-3 justify-between pt-2">
                            <div className="flex items-center space-x-3">
                                <Switch 
                                    id="indeterminate-mode" 
                                    checked={isIndeterminate}
                                    onCheckedChange={setIsIndeterminate}
                                />
                                <Label htmlFor="indeterminate-mode" className="text-base">Marcar como Contrato Indeterminado</Label>
                            </div>
                             <div>
                                <Label className="text-sm text-muted-foreground">Término de contrato: {formatDate(calculatedDates.termino)}</Label>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Al activar esta opción, el contrato se considerará permanente y no aparecerá en las alertas de vencimiento.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedContract(null)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}
