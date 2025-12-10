
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Save, Loader2, BookMarked, Briefcase, PlusCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRoleCheck } from '@/hooks/use-role-check';


interface Puesto {
  id: string;
  nombre: string;
}

interface Curso {
  id: string; // Document ID from Firestore
  id_curso: string;
  nombre_oficial: string;
}

interface PerfilPuesto {
    id: string;
    nombre_puesto: string;
    cursos_obligatorios: string[];
}

export default function MatrizDeHabilidadesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, checkAdminAndExecute } = useRoleCheck();

  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  const perfilesPuestoRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);

  const { data: empleados, isLoading: isLoadingPlantilla } = useCollection(plantillaRef);
  const { data: catalogoCursos, isLoading: isLoadingCursos } = useCollection<Curso>(catalogoCursosRef);
  const { data: perfilesPuesto, isLoading: isLoadingPerfiles } = useCollection<PerfilPuesto>(perfilesPuestoRef);
  
  const [puestosUnicos, setPuestosUnicos] = useState<Puesto[]>([]);
  const [selectedPuesto, setSelectedPuesto] = useState<Puesto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCursos, setSelectedCursos] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isCursoDialogOpen, setIsCursoDialogOpen] = useState(false);
  const [newCursoName, setNewCursoName] = useState('');
  const [isSavingCurso, setIsSavingCurso] = useState(false);

  useEffect(() => {
    if (empleados) {
      const puestos = new Set<string>();
      empleados.forEach(emp => {
        if (emp.puesto && emp.puesto.titulo) {
          puestos.add(emp.puesto.titulo);
        }
      });
      const puestosArray = Array.from(puestos).sort();
      setPuestosUnicos(puestosArray.map(p => ({ id: p.toLowerCase().replace(/[^a-z0-9]/g, '_'), nombre: p })));
    }
  }, [empleados]);

  useEffect(() => {
    if (selectedPuesto && perfilesPuesto) {
        const perfil = perfilesPuesto.find(p => p.id === selectedPuesto.id);
        if (perfil) {
            setSelectedCursos(new Set(perfil.cursos_obligatorios));
        } else {
            setSelectedCursos(new Set());
        }
    } else {
        setSelectedCursos(new Set());
    }
  }, [selectedPuesto, perfilesPuesto]);

  const filteredCursos = useMemo(() => {
    if (!catalogoCursos) return [];
    return catalogoCursos.filter(curso =>
      curso.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos, searchTerm]);

  const handleCursoToggle = (cursoId: string) => {
    checkAdminAndExecute(() => {
        setSelectedCursos(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(cursoId)) {
            newSelection.delete(cursoId);
        } else {
            newSelection.add(cursoId);
        }
        return newSelection;
        });
    });
  };

  const handleSave = async () => {
    checkAdminAndExecute(async () => {
        if (!selectedPuesto || !firestore) return;
        setIsSaving(true);
        
        const docId = selectedPuesto.id;
        const docRef = doc(firestore, 'perfiles_puesto', docId);

        const dataToSave = {
            nombre_puesto: selectedPuesto.nombre,
            cursos_obligatorios: Array.from(selectedCursos),
            fecha_actualizacion: serverTimestamp()
        };
        
        try {
            await setDoc(docRef, dataToSave, { merge: true });
            toast({
                title: "¡Guardado con éxito!",
                description: `Se han actualizado los cursos para el puesto de ${selectedPuesto.nombre}.`,
                className: "bg-green-100 text-green-800 border-green-300",
            });
        } catch (error) {
            console.error("Error saving profile:", error)
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los cambios. Revisa los permisos e inténtalo de nuevo.",
            });
        } finally {
            setIsSaving(false);
        }
    });
  };

  const handleSaveNewCurso = async () => {
    checkAdminAndExecute(async () => {
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
    });
  };

  const isLoading = isLoadingPlantilla || isLoadingCursos || isLoadingPerfiles;

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-6 lg:grid-cols-4">
      <Card className="rounded-2xl shadow-lg lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase /> Puestos de Trabajo</CardTitle>
          <CardDescription>Selecciona un puesto para asignar cursos.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                  Array.from({length: 10}).map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />)
              ) : (
                puestosUnicos.map(puesto => (
                  <Button
                    key={puesto.id}
                    variant={selectedPuesto?.id === puesto.id ? 'default' : 'ghost'}
                    className="w-full justify-start rounded-lg text-left"
                    onClick={() => setSelectedPuesto(puesto)}
                  >
                    {puesto.nombre}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-lg lg:col-span-3 flex flex-col">
        <CardHeader>
          <div className='flex justify-between items-start flex-wrap gap-4'>
            <div>
              <CardTitle className="flex items-center gap-2"><BookMarked /> Catálogo de Cursos</CardTitle>
              <CardDescription>
                {selectedPuesto ? `Asignando cursos para: ${selectedPuesto.nombre}` : 'Selecciona un puesto para comenzar.'}
              </CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button onClick={() => checkAdminAndExecute(() => setIsCursoDialogOpen(true))} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Curso
              </Button>
              {selectedPuesto && (
                <Button onClick={handleSave} disabled={isSaving || !isAdmin}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Cambios
                </Button>
              )}
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar curso por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
              disabled={!catalogoCursos}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
                {isLoadingCursos ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({length: 20}).map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}
                    </div>
                ) : (
                  selectedPuesto ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4 pr-4">
                        {filteredCursos.map(curso => (
                            <div key={curso.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors">
                            <Checkbox
                                id={curso.id}
                                checked={selectedCursos.has(curso.id_curso)}
                                onCheckedChange={() => handleCursoToggle(curso.id_curso)}
                                disabled={!isAdmin}
                            />
                            <Label htmlFor={curso.id} className="text-sm font-normal cursor-pointer leading-tight">
                                {curso.nombre_oficial}
                            </Label>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <p>Selecciona un puesto de la lista para ver y asignar cursos.</p>
                    </div>
                  )
                )}
            </ScrollArea>
        </CardContent>
         <CardFooter className="pt-6 text-xs text-muted-foreground">
            Total de cursos en el catálogo: {catalogoCursos?.length || 0}
        </CardFooter>
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
    </div>
  );
}
