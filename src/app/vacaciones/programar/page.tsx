
"use client";

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, addDoc, Timestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


// Interfaces
interface Empleado { id: string; id_empleado: string; nombre_completo: string; }
interface Vacacion {
  id: string;
  id_empleado: string;
  nombre_empleado: string;
  fecha_inicio: Timestamp;
  fecha_fin: Timestamp;
  tipo: 'Vacaciones' | 'Permiso' | 'Incapacidad' | 'Falta';
  comentarios?: string;
}

const formSchema = z.object({
  empleado: z.object({
    id: z.string().min(1, 'Debes seleccionar un empleado.'),
    nombre: z.string(),
  }),
  dateRange: z.object({
    from: z.date({ required_error: "La fecha de inicio es obligatoria." }),
    to: z.date({ required_error: "La fecha de fin es obligatoria." }),
  }),
  tipo: z.string().min(1, 'Debes seleccionar un tipo de ausencia.'),
  comentarios: z.string().optional(),
});


export default function ProgramarVacacionesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmpleadoPopoverOpen, setIsEmpleadoPopoverOpen] = useState(false);

  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const vacacionesQuery = useMemoFirebase(() => query(collection(firestore, 'vacaciones'), orderBy('fecha_inicio', 'desc')), [firestore]);

  const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
  const { data: vacaciones, isLoading: loadingVacaciones } = useCollection<Vacacion>(vacacionesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comentarios: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    if(!firestore) return;

    try {
      const colRef = collection(firestore, 'vacaciones');
      await addDoc(colRef, {
        id_empleado: values.empleado.id,
        nombre_empleado: values.empleado.nombre,
        fecha_inicio: values.dateRange.from,
        fecha_fin: values.dateRange.to,
        tipo: values.tipo,
        comentarios: values.comentarios || '',
        creado_el: serverTimestamp(),
      });
      toast({
        title: "Registro Exitoso",
        description: `Se han programado las ausencias para ${values.empleado.nombre}.`,
        className: "bg-green-100 text-green-800 border-green-300",
      });
      form.reset({ comentarios: '' });
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el registro." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vacacionId: string) => {
    if(!firestore) return;
    const docRef = doc(firestore, 'vacaciones', vacacionId);
    try {
        await deleteDoc(docRef);
        toast({ title: "Registro eliminado", description: "La ausencia ha sido eliminada del historial."});
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar el registro."});
    }
  };
  
   const sortedEmpleados = useMemo(() => {
    if (!empleados) return [];
    return [...empleados].sort((a,b) => a.nombre_completo.localeCompare(b.nombre_completo));
   },[empleados]);
   
   const badgeColors: {[key: string]: string} = {
    'Vacaciones': 'bg-blue-500',
    'Permiso': 'bg-yellow-500',
    'Incapacidad': 'bg-purple-500',
    'Falta': 'bg-red-500'
   }

  return (
    <div className="space-y-8">
        <Link href="/inicio" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Inicio
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Programar Ausencia</CardTitle>
                        <CardDescription>Registra vacaciones, permisos o incapacidades del personal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        
                            <FormField
                            control={form.control}
                            name="empleado"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Empleado</FormLabel>
                                <Popover open={isEmpleadoPopoverOpen} onOpenChange={setIsEmpleadoPopoverOpen}>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                        >
                                        {field.value?.nombre || "Seleccionar empleado"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Buscar empleado..." />
                                        <CommandList>
                                        <ScrollArea className='h-64'>
                                            <CommandEmpty>No se encontró.</CommandEmpty>
                                            <CommandGroup>
                                                {loadingEmpleados ? <CommandItem disabled>Cargando...</CommandItem> :
                                                sortedEmpleados.map(emp => (
                                                    <CommandItem
                                                        value={`${emp.nombre_completo} ${emp.id_empleado}`}
                                                        key={emp.id}
                                                        onSelect={() => {
                                                            form.setValue("empleado", {id: emp.id_empleado, nombre: emp.nombre_completo});
                                                            setIsEmpleadoPopoverOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", emp.id_empleado === field.value?.id ? "opacity-100" : "opacity-0")} />
                                                        {emp.nombre_completo}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </ScrollArea>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Rango de Fechas</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        id="date"
                                        variant="outline"
                                        className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value?.from ? (
                                            field.value.to ? (
                                            `${format(field.value.from, "LLL dd, y", {locale: es})} - ${format(field.value.to, "LLL dd, y", {locale: es})}`
                                            ) : (
                                            format(field.value.from, "LLL dd, y", {locale: es})
                                            )
                                        ) : (
                                            <span>Selecciona un rango</span>
                                        )}
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={field.value?.from}
                                        selected={field.value as DateRange}
                                        onSelect={field.onChange}
                                        numberOfMonths={2}
                                        locale={es}
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                             <FormField
                                control={form.control}
                                name="tipo"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Tipo de Ausencia</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                                        <SelectItem value="Permiso">Permiso</SelectItem>
                                        <SelectItem value="Incapacidad">Incapacidad</SelectItem>
                                        <SelectItem value="Falta">Falta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            <FormField
                            control={form.control}
                            name="comentarios"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Comentarios</FormLabel>
                                <FormControl><Input placeholder="(Opcional)" {...field} /></FormControl>
                                </FormItem>
                            )}
                            />
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Registro
                                </Button>
                            </div>
                        </form>
                    </Form>
                    </CardContent>
                </Card>
            </div>
      
            <div className="lg:col-span-3">
                <Card>
                    <CardHeader>
                    <CardTitle>Historial de Ausencias Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ScrollArea className="h-[70vh]">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Empleado</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Desde</TableHead>
                            <TableHead>Hasta</TableHead>
                            <TableHead>Comentarios</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingVacaciones ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Cargando historial...</TableCell></TableRow>
                            ) : (vacaciones || []).map(v => (
                            <TableRow key={v.id}>
                                <TableCell>{v.nombre_empleado}</TableCell>
                                <TableCell><Badge className={cn("text-white", badgeColors[v.tipo] || 'bg-gray-400')}>{v.tipo}</Badge></TableCell>
                                <TableCell>{format(v.fecha_inicio.toDate(), "P", { locale: es })}</TableCell>
                                <TableCell>{format(v.fecha_fin.toDate(), "P", { locale: es })}</TableCell>
                                <TableCell className="text-muted-foreground truncate max-w-[150px]">{v.comentarios}</TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción es permanente y eliminará el registro de ausencia para <strong>{v.nombre_empleado}</strong>.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </ScrollArea>
                    </CardContent>
                </Card>
            </div>
      </div>
    </div>
  );
}
