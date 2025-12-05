
'use client';

import { useState, useMemo } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, PlusCircle, Trash2, User, Briefcase } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoleCheck } from '@/hooks/use-role-check';

interface EmpleadoPuesto {
  departamento: string;
  area: string;
  titulo: string;
  turno: string;
}

interface Empleado {
  id: string; // Document ID from Firestore
  id_empleado: string;
  nombre_completo: string;
  puesto: EmpleadoPuesto;
}

const initialEmpleadoState: Omit<Empleado, 'id'> = {
  id_empleado: '',
  nombre_completo: '',
  puesto: {
    departamento: '',
    area: '',
    titulo: '',
    turno: '',
  },
};

export default function EmpleadosPage() {
  const firestore = useFirestore();
  const { isAdmin, checkAdminAndExecute } = useRoleCheck();
  const plantillaRef = useMemoFirebase(() => firestore ? collection(firestore, 'Plantilla') : null, [firestore]);
  const { data: empleados, isLoading } = useCollection<Empleado>(plantillaRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Omit<Empleado, 'id'> | null>(null);
  const [isNewEmpleado, setIsNewEmpleado] = useState(false);
  const [empleadoToDelete, setEmpleadoToDelete] = useState<Empleado | null>(null);

  const filteredEmpleados = useMemo(() => {
    if (!empleados) return [];
    return empleados.filter((empleado: Empleado) => {
      if (!empleado.id_empleado || !empleado.nombre_completo) return false;
      const search = searchTerm.toLowerCase();
      return (
        empleado.id_empleado.toLowerCase().includes(search) ||
        empleado.nombre_completo.toLowerCase().includes(search) ||
        (empleado.puesto?.departamento || '').toLowerCase().includes(search) ||
        (empleado.puesto?.titulo || '').toLowerCase().includes(search)
      );
    }).sort((a,b) => parseInt(a.id_empleado, 10) - parseInt(b.id_empleado, 10));
  }, [empleados, searchTerm]);

  const { departamentosUnicos, areasUnicas, titulosUnicos, turnosUnicos } = useMemo(() => {
    if (!empleados) return { departamentosUnicos: [], areasUnicas: [], titulosUnicos: [], turnosUnicos: [] };
    const departamentos = new Set<string>();
    const areas = new Set<string>();
    const titulos = new Set<string>();
    const turnos = new Set<string>();

    empleados.forEach(emp => {
      if (emp.puesto) {
        if(emp.puesto.departamento) departamentos.add(emp.puesto.departamento);
        if(emp.puesto.area) areas.add(emp.puesto.area);
        if(emp.puesto.titulo) titulos.add(emp.puesto.titulo);
        if(emp.puesto.turno) turnos.add(emp.puesto.turno);
      }
    });

    return {
      departamentosUnicos: Array.from(departamentos).sort(),
      areasUnicas: Array.from(areas).sort(),
      titulosUnicos: Array.from(titulos).sort(),
      turnosUnicos: Array.from(turnos).sort(),
    };
  }, [empleados]);

  const handleOpenDialog = (empleado: Empleado | null) => {
      checkAdminAndExecute(() => {
        if (empleado) {
          const { id, ...empleadoData } = empleado;
          setSelectedEmpleado(empleadoData);
          setIsNewEmpleado(false);
        } else {
          setSelectedEmpleado(initialEmpleadoState);
          setIsNewEmpleado(true);
        }
      });
  };

  const handleCloseDialog = () => {
    setSelectedEmpleado(null);
    setIsNewEmpleado(false);
  };
  
  const handleSave = () => {
    checkAdminAndExecute(() => {
        if (!selectedEmpleado || !firestore) return;

        const docId = selectedEmpleado.id_empleado;
        if (!docId) {
            alert('El ID de empleado es obligatorio.');
            return;
        }

        const empleadoDocRef = doc(firestore, 'Plantilla', docId);
        
        // Guardar datos del empleado
        setDocumentNonBlocking(empleadoDocRef, selectedEmpleado, { merge: !isNewEmpleado });

        // Si es un empleado nuevo, crear su contrato
        if (isNewEmpleado) {
            const contratoDocRef = doc(firestore, 'Contratos', docId);
            const ingresoDate = new Date();
            
            const newContractData = {
                id_empleado: docId,
                nombre_completo: selectedEmpleado.nombre_completo,
                departamento: selectedEmpleado.puesto.departamento,
                indeterminado: false,
                fechas_contrato: {
                    ingreso: ingresoDate,
                    termino: addDays(ingresoDate, 89)
                },
                evaluaciones: {
                    primera: {
                        fecha_programada: addDays(ingresoDate, 30),
                        calificacion_texto: 'Pendiente',
                        calificacion_valor: null,
                        estatus: 'Pendiente'
                    },
                    segunda: {
                        fecha_programada: addDays(ingresoDate, 60),
                        calificacion_texto: 'Pendiente',
                        calificacion_valor: null,
                        estatus: 'Pendiente'
                    },
                    tercera: {
                        fecha_programada: addDays(ingresoDate, 80),
                        calificacion_texto: 'Pendiente',
                        calificacion_valor: null,
                        estatus: 'Pendiente'
                    }
                }
            };
            setDocumentNonBlocking(contratoDocRef, newContractData, { merge: false });
        }

        handleCloseDialog();
    });
  };


  const handleDelete = (empleado: Empleado) => {
    checkAdminAndExecute(() => {
        setEmpleadoToDelete(empleado);
    });
  };

  const confirmDelete = () => {
    checkAdminAndExecute(() => {
        if (!empleadoToDelete || !firestore) return;
        const docRef = doc(firestore, 'Plantilla', empleadoToDelete.id);
        deleteDocumentNonBlocking(docRef);
        
        // Opcional: eliminar también el contrato asociado
        const contratoRef = doc(firestore, 'Contratos', empleadoToDelete.id);
        deleteDocumentNonBlocking(contratoRef);

        setEmpleadoToDelete(null);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEmpleado) return;
    const { name, value } = e.target;
    setSelectedEmpleado({ ...selectedEmpleado, [name]: value });
  };

  const handlePuestoChange = (name: string, value: string) => {
      if (!selectedEmpleado) return;
      setSelectedEmpleado({
          ...selectedEmpleado,
          puesto: {
              ...selectedEmpleado.puesto,
              [name]: value
          }
      });
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-bold tracking-tight">Gestión de Empleados</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Administra la información del personal de la empresa.
            </p>
        </div>
        <Button onClick={() => handleOpenDialog(null)} className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" />
            Crear Empleado
        </Button>
      </div>

      <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Listado de Personal</CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando empleados...' : `Total: ${filteredEmpleados.length} empleados`}
          </CardDescription>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, Nombre, Puesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Nombre Completo</TableHead>
                  <TableHead className="font-semibold">Departamento</TableHead>
                  <TableHead className="font-semibold">Puesto</TableHead>
                  <TableHead className="font-semibold">Turno</TableHead>
                  <TableHead className="text-right font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpleados.map((empleado: Empleado) => (
                  <TableRow key={empleado.id} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="font-medium">{empleado.id_empleado}</TableCell>
                    <TableCell onClick={() => handleOpenDialog(empleado)} className="cursor-pointer font-medium text-primary hover:underline">{empleado.nombre_completo}</TableCell>
                    <TableCell>{empleado.puesto?.departamento}</TableCell>
                    <TableCell>{empleado.puesto?.titulo}</TableCell>
                    <TableCell>{empleado.puesto?.turno}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(empleado)}>
                            <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                            <span className="sr-only">Borrar</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedEmpleado && (
        <Dialog open={!!selectedEmpleado} onOpenChange={handleCloseDialog}>
            <DialogContent className="rounded-2xl sm:max-w-2xl bg-card/80 backdrop-blur-lg border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">{isNewEmpleado ? 'Crear Nuevo Empleado' : 'Editar Empleado'}</DialogTitle>
                    <DialogDescription>
                        {isNewEmpleado ? 'Completa los campos para agregar un nuevo miembro al equipo.' : `Actualizando a ${selectedEmpleado.nombre_completo}`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="py-6 px-5 space-y-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><User className="text-primary"/> Información Personal</h3>
                            <div className="space-y-2">
                                <Label htmlFor="id_empleado">ID del Empleado</Label>
                                <Input id="id_empleado" name="id_empleado" value={selectedEmpleado.id_empleado} onChange={handleInputChange} className="rounded-md" disabled={!isNewEmpleado} placeholder="Ej: 4041"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nombre_completo">Nombre Completo</Label>
                                <Input id="nombre_completo" name="nombre_completo" value={selectedEmpleado.nombre_completo} onChange={handleInputChange} className="rounded-md" placeholder="Ej: Juan Pérez"/>
                            </div>
                        </div>
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><Briefcase className="text-primary"/> Información del Puesto</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="departamento">Departamento</Label>
                                    <Select value={selectedEmpleado.puesto.departamento} onValueChange={(value) => handlePuestoChange('departamento', value)}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un depto." /></SelectTrigger>
                                    <SelectContent>
                                        {departamentosUnicos.map(depto => <SelectItem key={depto} value={depto}>{depto}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="area">Área</Label>
                                    <Select value={selectedEmpleado.puesto.area} onValueChange={(value) => handlePuestoChange('area', value)}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un área" /></SelectTrigger>
                                    <SelectContent>
                                        {areasUnicas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="titulo">Puesto</Label>
                                    <Select value={selectedEmpleado.puesto.titulo} onValueChange={(value) => handlePuestoChange('titulo', value)}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un puesto" /></SelectTrigger>
                                    <SelectContent>
                                        {titulosUnicos.map(titulo => <SelectItem key={titulo} value={titulo}>{titulo}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="turno">Turno</Label>
                                    <Select value={selectedEmpleado.puesto.turno} onValueChange={(value) => handlePuestoChange('turno', value)}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona un turno" /></SelectTrigger>
                                    <SelectContent>
                                        {turnosUnicos.map(turno => <SelectItem key={turno} value={turno}>{turno}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 pr-6">
                    <Button variant="outline" className="rounded-full px-6" onClick={handleCloseDialog}>Cancelar</Button>
                    <Button className="rounded-full px-6" onClick={handleSave}>Guardar Cambios</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {empleadoToDelete && (
        <AlertDialog open={!!empleadoToDelete} onOpenChange={() => setEmpleadoToDelete(null)}>
            <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente al empleado
                        <span className="font-bold"> {empleadoToDelete.nombre_completo} </span>
                         de la base de datos, así como su contrato asociado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
