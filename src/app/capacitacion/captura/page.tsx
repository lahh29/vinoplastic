'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar as CalendarComponent } from '@/components/ui/calendar'; // Renamed to avoid conflict
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, PlusCircle, Save } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';


// Interfaces
interface Empleado {
  id: string;
  id_empleado: string;
  nombre_completo: string;
}
interface CursoCatalogo {
  id: string; // Document ID, which is the normalized name
  id_curso: string; // The normalized name itself
  nombre_oficial: string;
}

const formSchema = z.object({
  id_empleado: z.string({ required_error: 'Debes seleccionar un empleado.' }),
  id_curso: z.string({ required_error: 'Debes seleccionar un curso.' }),
  calificacion: z.coerce.number().min(0, 'La calificación no puede ser negativa.').max(100, 'La calificación no puede ser mayor a 100.'),
  fecha_aplicacion: z.date({ required_error: 'La fecha es obligatoria.' }),
});

export default function CapturaCapacitacionPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmpleadoPopoverOpen, setIsEmpleadoPopoverOpen] = useState(false);
  const [isCursoPopoverOpen, setIsCursoPopoverOpen] = useState(false);
  const [isCursoDialogOpen, setIsCursoDialogOpen] = useState(false);
  const [newCursoName, setNewCursoName] = useState('');
  const [isSavingCurso, setIsSavingCurso] = useState(false);

  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);

  const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);
  const { data: catalogoCursos, isLoading: loadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calificacion: 80,
    },
  });
  
  const sortedCursos = useMemo(() => {
    if (!catalogoCursos) return [];
    return [...catalogoCursos].sort((a,b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
        const historialRef = doc(firestore, 'historial_capacitacion', values.id_empleado);
        const historialSnap = await getDoc(historialRef);

        const nuevoCurso = {
            id_curso: values.id_curso,
            calificacion: values.calificacion,
            fecha_aplicacion: format(values.fecha_aplicacion, "dd/MM/yyyy"),
        };

        if (historialSnap.exists()) {
            const data = historialSnap.data();
            const cursosExistentes = data.cursos || [];

            // Filtrar para remover el curso si ya existe, para sobreescribirlo
            const cursosActualizados = cursosExistentes.filter((c: any) => c.id_curso !== values.id_curso);

            await setDoc(historialRef, {
                ...data,
                cursos: [...cursosActualizados, nuevoCurso],
                total_cursos: cursosActualizados.length + 1,
            }, { merge: true });

        } else {
            // Si el empleado no tiene historial, se crea uno nuevo
            await setDoc(historialRef, {
                id_empleado: values.id_empleado,
                cursos: [nuevoCurso],
                total_cursos: 1,
            });
        }
        
        const empleadoSeleccionado = empleados?.find(e => e.id_empleado === values.id_empleado);
        const cursoSeleccionado = catalogoCursos?.find(c => c.id === values.id_curso);

        toast({
            title: "Registro Exitoso",
            description: `Se registró el curso "${cursoSeleccionado?.nombre_oficial}" para ${empleadoSeleccionado?.nombre_completo}.`,
            className: "bg-green-100 text-green-800 border-green-300",
        });
        
        form.reset({ calificacion: 80 });

    } catch (error) {
        console.error("Error al guardar el registro:", error);
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: "No se pudo registrar la capacitación. Revisa los permisos e inténtalo de nuevo.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSaveNewCurso = async () => {
    if (!newCursoName.trim() || !firestore) return;
    setIsSavingCurso(true);

    const id_curso = newCursoName.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_');
      
    if (!id_curso) {
        toast({ variant: 'destructive', title: 'Nombre de curso inválido' });
        setIsSavingCurso(false);
        return;
    }
    
    const docRef = doc(firestore, 'catalogo_cursos', id_curso);

    const newCursoData = {
      id_curso: id_curso,
      nombre_oficial: newCursoName.trim()
    };

    try {
      await setDoc(docRef, newCursoData, {merge: false});
      toast({
        title: "Curso creado",
        description: `El curso "${newCursoName.trim()}" ha sido añadido al catálogo.`,
        className: "bg-green-100 text-green-800 border-green-300",
      });
      setNewCursoName('');
      setIsCursoDialogOpen(false);
    } catch (error) {
        console.error("Error creating course:", error);
        toast({
            variant: "destructive",
            title: "Error al crear curso",
            description: "No se pudo guardar el nuevo curso. Es posible que ya exista.",
        });
    } finally {
      setIsSavingCurso(false);
    }
  };


  return (
    <>
    <Card className="max-w-4xl mx-auto shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Captura de Capacitación</CardTitle>
        <CardDescription>
          Registra los cursos que ha completado el personal para mantener los historiales actualizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Selector de Empleado */}
                <FormField
                  control={form.control}
                  name="id_empleado"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Empleado</FormLabel>
                      <Popover open={isEmpleadoPopoverOpen} onOpenChange={setIsEmpleadoPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? empleados?.find(emp => emp.id_empleado === field.value)?.nombre_completo
                                : "Selecciona un empleado"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar por nombre o ID..." />
                            <CommandList>
                                <CommandEmpty>No se encontró el empleado.</CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className="h-64">
                                    {empleados?.map(emp => (
                                        <CommandItem
                                            value={`${emp.nombre_completo} ${emp.id_empleado}`}
                                            key={emp.id}
                                            onSelect={() => {
                                                form.setValue("id_empleado", emp.id_empleado);
                                                setIsEmpleadoPopoverOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", emp.id_empleado === field.value ? "opacity-100" : "opacity-0")} />
                                            <span>{emp.nombre_completo} <span className="text-xs text-muted-foreground ml-2">ID: {emp.id_empleado}</span></span>
                                        </CommandItem>
                                    ))}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selector de Curso */}
                <FormField
                  control={form.control}
                  name="id_curso"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <FormLabel>Curso</FormLabel>
                        <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setIsCursoDialogOpen(true)}>
                          <PlusCircle className="mr-1 h-3 w-3" />
                          Crear Curso
                        </Button>
                      </div>
                       <Popover open={isCursoPopoverOpen} onOpenChange={setIsCursoPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between",!field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? sortedCursos?.find(curso => curso.id === field.value)?.nombre_oficial
                                : "Selecciona un curso"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar curso..." />
                             <CommandList>
                                <CommandEmpty>No se encontró el curso.</CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className="h-64">
                                        {sortedCursos?.map(curso => (
                                            <CommandItem
                                            value={curso.nombre_oficial}
                                            key={curso.id}
                                            onSelect={() => {
                                                form.setValue("id_curso", curso.id);
                                                setIsCursoPopoverOpen(false);
                                            }}
                                            >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                curso.id === field.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {curso.nombre_oficial}
                                            </CommandItem>
                                        ))}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 {/* Calificación */}
                <FormField
                  control={form.control}
                  name="calificacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calificación (0-100)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ej: 85" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fecha de Aplicación */}
                <FormField
                  control={form.control}
                  name="fecha_aplicacion"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Aplicación</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && isValid(field.value) ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Selecciona una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1990-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} size="lg">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Registrar Capacitación
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
     {/* Dialog para crear curso */}
      <Dialog open={isCursoDialogOpen} onOpenChange={setIsCursoDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Curso</DialogTitle>
            <DialogDescription>
              Añade un nuevo curso al catálogo general. Este estará disponible para todos los puestos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="curso-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="curso-name"
                value={newCursoName}
                onChange={(e) => setNewCursoName(e.target.value)}
                className="col-span-3"
                placeholder="Ej: Seguridad Industrial Avanzada"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNewCurso} disabled={isSavingCurso || !newCursoName.trim()}>
              {isSavingCurso ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Curso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
