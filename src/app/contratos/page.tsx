'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { AlertTriangle, FileClock, Search, Calendar, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, Timestamp } from 'firebase/firestore';
import { format, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface Contrato {
  id: string; // Document ID from Firestore
  id_empleado: string;
  nombre_completo: string;
  departamento: string;
  fechas_contrato: ContratoFechas;
  evaluaciones: ContratoEvaluaciones;
  indeterminado?: boolean;
}

const getDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    // Handle Firestore Timestamp object
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    // Handle string or number date representations
    const date = new Date(timestamp);
    if (isValid(date)) {
      return date;
    }
    return null;
};

// Helper para convertir Timestamp de Firestore a un formato más legible
const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  const date = getDate(timestamp);
  if (!date || !isValid(date)) {
      return 'Fecha inválida';
  }
  return format(date, 'dd/MMM/yy', { locale: es });
};


export default function ContratosPage() {
  const firestore = useFirestore();
  const contratosRef = useMemoFirebase(() => firestore ? collection(firestore, 'Contratos') : null, [firestore]);
  const { data: contratos, isLoading } = useCollection<Contrato>(contratosRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [expiringContracts, setExpiringContracts] = useState<Contrato[]>([]);
  const [dueEvaluations, setDueEvaluations] = useState<{contrato: Contrato, fecha: string, tipo: string}[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contrato | null>(null);
  const [evaluations, setEvaluations] = useState({
    eval1: '',
    eval2: '',
    eval3: '',
  });
  const [calculatedDates, setCalculatedDates] = useState<{
    eval1: Date | null;
    eval2: Date | null;
    eval3: Date | null;
    termino: Date | null;
  }>({ eval1: null, eval2: null, eval3: null, termino: null });

  const [isIndeterminate, setIsIndeterminate] = useState(false);

  useEffect(() => {
    if (!contratos) return;

    const today = new Date();
    const fifteenDaysFromNow = new Date();
    fifteenDaysFromNow.setDate(today.getDate() + 15);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const expiring = contratos.filter(c => {
        if (c.indeterminado) return false;
        const termDate = getDate(c.fechas_contrato?.termino);
        return termDate && termDate >= today && termDate <= fifteenDaysFromNow;
    });
    
    const evaluationsDue: {contrato: Contrato, fecha: string, tipo: string}[] = [];
    contratos.forEach(c => {
        if (!c.evaluaciones) return;
        const eval1Date = getDate(c.evaluaciones.primera?.fecha_programada);
        const eval2Date = getDate(c.evaluaciones.segunda?.fecha_programada);
        const eval3Date = getDate(c.evaluaciones.tercera?.fecha_programada);

        if (eval1Date && eval1Date >= today && eval1Date <= sevenDaysFromNow && (c.evaluaciones.primera.estatus === 'Pendiente')) {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.primera.fecha_programada), tipo: 'Primera' });
        }
        if (eval2Date && eval2Date >= today && eval2Date <= sevenDaysFromNow && (c.evaluaciones.segunda.estatus === 'Pendiente')) {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.segunda.fecha_programada), tipo: 'Segunda' });
        }
        if (eval3Date && eval3Date >= today && eval3Date <= sevenDaysFromNow && (c.evaluaciones.tercera.estatus === 'Pendiente')) {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.tercera.fecha_programada), tipo: 'Tercera' });
        }
    });

    setExpiringContracts(expiring.sort((a,b) => (getDate(a.fechas_contrato.termino)?.getTime() ?? 0) - (getDate(b.fechas_contrato.termino)?.getTime() ?? 0)));
    setDueEvaluations(evaluationsDue.sort((a,b) => {
        const dateA = getDate(a.contrato.evaluaciones?.primera?.fecha_programada) ?? new Date(0);
        const dateB = getDate(b.contrato.evaluaciones?.primera?.fecha_programada) ?? new Date(0);
        return dateA.getTime() - dateB.getTime();
    }));
  }, [contratos]);

  const filteredContratos = useMemo(() => {
    if (!contratos) return [];
    return contratos.filter((contrato: Contrato) => {
      if (!contrato.id_empleado || !contrato.nombre_completo) return false;
      const search = searchTerm.toLowerCase();
      return (
        contrato.id_empleado.toLowerCase().includes(search) ||
        contrato.nombre_completo.toLowerCase().includes(search)
      );
    });
  }, [contratos, searchTerm]);
  

  const handleRowClick = (contrato: Contrato) => {
    setSelectedContract(contrato);
    setEvaluations({
        eval1: contrato.evaluaciones?.primera?.calificacion_texto || 'Pendiente',
        eval2: contrato.evaluaciones?.segunda?.calificacion_texto || 'Pendiente',
        eval3: contrato.evaluaciones?.tercera?.calificacion_texto || 'Pendiente',
    });
    setIsIndeterminate(contrato.indeterminado || false);

    const ingresoDate = getDate(contrato.fechas_contrato.ingreso);
    if(ingresoDate) {
        setCalculatedDates({
            eval1: addDays(ingresoDate, 30),
            eval2: addDays(ingresoDate, 60),
            eval3: addDays(ingresoDate, 80),
            termino: addDays(ingresoDate, 89)
        });
    }
  };

  const handleSave = () => {
    if (!selectedContract || !firestore) return;

    const docRef = doc(firestore, 'Contratos', selectedContract.id);
    
    const updatedData = JSON.parse(JSON.stringify(selectedContract));

    updatedData.evaluaciones.primera.calificacion_texto = evaluations.eval1;
    updatedData.evaluaciones.primera.estatus = (evaluations.eval1 === 'Pendiente' || evaluations.eval1 === '') ? 'Pendiente' : 'Evaluado';
    
    updatedData.evaluaciones.segunda.calificacion_texto = evaluations.eval2;
    updatedData.evaluaciones.segunda.estatus = (evaluations.eval2 === 'Pendiente' || evaluations.eval2 === '') ? 'Pendiente' : 'Evaluado';

    updatedData.evaluaciones.tercera.calificacion_texto = evaluations.eval3;
    updatedData.evaluaciones.tercera.estatus = (evaluations.eval3 === 'Pendiente' || evaluations.eval3 === '') ? 'Pendiente' : 'Evaluado';
    
    updatedData.indeterminado = isIndeterminate;

    updatedData.fechas_contrato.termino = calculatedDates.termino;
    updatedData.evaluaciones.primera.fecha_programada = calculatedDates.eval1;
    updatedData.evaluaciones.segunda.fecha_programada = calculatedDates.eval2;
    updatedData.evaluaciones.tercera.fecha_programada = calculatedDates.eval3;


    delete updatedData.id;

    setDocumentNonBlocking(docRef, updatedData, { merge: true });
    setSelectedContract(null);
  };
  
  return (
    <div className="space-y-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Gestión de Contratos</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Supervisa vencimientos, evaluaciones y desempeño del personal.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-semibold">Contratos por Vencer</CardTitle>
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">En los próximos 15 días.</p>
                {expiringContracts.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {expiringContracts.map(c => (
                            <div key={c.id} className="p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg">
                                <p className="font-semibold text-sm">{c.nombre_completo}</p>
                                <p className="text-xs text-muted-foreground">Vence el: {formatDate(c.fechas_contrato?.termino)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No hay contratos por vencer.</p>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-semibold">Evaluaciones Próximas</CardTitle>
                <FileClock className="h-6 w-6 text-primary" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">En los próximos 7 días.</p>
                 {dueEvaluations.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {dueEvaluations.map(item => (
                             <div key={item.contrato.id + item.tipo} className="p-3 bg-primary/10 border-l-4 border-primary rounded-r-lg">
                                <p className="font-semibold text-sm">{item.contrato.nombre_completo}</p>
                                <p className="text-xs text-muted-foreground">
                                   {item.tipo} evaluación antes del: {item.fecha}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No hay evaluaciones próximas.</p>
                )}
            </CardContent>
        </Card>
      </div>

      <Card>
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
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Ingreso</TableHead>
                  <TableHead className="font-semibold">Vencimiento</TableHead>
                  <TableHead className="font-semibold">Tipo De Contrato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContratos.map((contrato: Contrato) => (
                  <TableRow key={contrato.id} onClick={() => handleRowClick(contrato)} className="cursor-pointer hover:bg-accent">
                    <TableCell>{contrato.id_empleado}</TableCell>
                    <TableCell className="font-medium">{contrato.nombre_completo}</TableCell>
                    <TableCell>{formatDate(contrato.fechas_contrato?.ingreso)}</TableCell>
                    <TableCell className={cn(contrato.indeterminado && "opacity-50")}>
                        {formatDate(contrato.fechas_contrato?.termino)}
                    </TableCell>
                    <TableCell>
                      {contrato.indeterminado ? (
                          <Badge variant="outline" className="text-green-400 border-green-400/50">Indeterminado</Badge>
                      ) : (
                          <Badge variant="secondary">Determinado</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Seguimiento de Evaluaciones</DialogTitle>
                    <DialogDescription className="text-base">
                        {selectedContract.nombre_completo} (ID: {selectedContract.id_empleado})
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-6">
                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Star className="text-yellow-400"/> Evaluaciones de Desempeño</h3>
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
                       <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp className="text-green-400"/> Estatus del Contrato</h3>
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
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
