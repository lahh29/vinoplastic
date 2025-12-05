
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
import { CalendarPlus, Loader2, Save, BookCopy, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

// --- Interfaces ---
interface CursoCatalogo {
  id: string; // Document ID from Firestore
  id_curso: string;
  nombre_oficial: string;
}

interface ProgramaMes {
  id: string; // '2026-01', '2026-02', etc.
  cursos: string[]; // Array de id_curso
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// --- Componente de Tarjeta de Mes ---
const MonthCard = ({ mes, anio, cursosPlaneados, onPlanificar, isLoading }: { mes: string, anio: number, cursosPlaneados: CursoCatalogo[], onPlanificar: () => void, isLoading: boolean }) => (
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
                            {cursosPlaneados.map(curso => <li key={curso.id}>{curso.nombre_oficial}</li>)}
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
export default function ProgramaAnualPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [selectedCursos, setSelectedCursos] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  const programaRef = useMemoFirebase(() => collection(firestore, 'programa_anual'), [firestore]);

  const { data: catalogoCursos, isLoading: loadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);
  const { data: programas, isLoading: loadingProgramas } = useCollection<ProgramaMes>(programaRef);

  const isLoading = loadingCursos || loadingProgramas;

  const programaPorMes = useMemo(() => {
    const mapa: Record<string, string[]> = {};
    programas?.forEach(p => {
        mapa[p.id] = p.cursos;
    });
    return mapa;
  }, [programas]);

  const catalogoMap = useMemo(() => new Map(catalogoCursos?.map(c => [c.id_curso, c])), [catalogoCursos]);
  
  const sortedCursosCatalogo = useMemo(() => {
      if(!catalogoCursos) return [];
      return [...catalogoCursos].sort((a,b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos])

  const filteredCursosDialog = useMemo(() => {
    return sortedCursosCatalogo.filter(curso =>
      curso.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedCursosCatalogo, searchTerm]);

  const handleOpenDialog = (mesIndex: number) => {
    const mesId = `2026-${String(mesIndex + 1).padStart(2, '0')}`;
    setActiveMonth(mesId);
    setSelectedCursos(new Set(programaPorMes[mesId] || []));
  };
  
  const handleSave = async () => {
    if (!activeMonth || !firestore) return;
    setIsSaving(true);
    
    const docRef = doc(firestore, 'programa_anual', activeMonth);
    
    try {
        await setDocumentNonBlocking(docRef, { cursos: Array.from(selectedCursos) }, { merge: true });
        toast({
            title: "Plan Guardado",
            description: `Se han actualizado los cursos para el mes seleccionado.`,
            className: "bg-green-100 text-green-800 border-green-300",
        });
        setActiveMonth(null);
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar la planificación."});
    } finally {
        setIsSaving(false);
    }
  }

  const handleCursoToggle = (cursoId: string) => {
    setSelectedCursos(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(cursoId)) {
            newSelection.delete(cursoId);
        } else {
            newSelection.add(cursoId);
        }
        return newSelection;
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Programa Anual de Capacitación 2026</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Planifica y visualiza los cursos que se impartirán cada mes del año.
        </p>
      </div>

      <motion.div initial={{opacity: 0}} animate={{opacity: 1, transition:{ staggerChildren: 0.05 }}} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MESES.map((mes, index) => {
            const mesId = `2026-${String(index + 1).padStart(2, '0')}`;
            const cursosDelMesIds = programaPorMes[mesId] || [];
            const cursosDelMes = cursosDelMesIds.map(id => catalogoMap.get(id)).filter((c): c is CursoCatalogo => !!c);
            return (
                <MonthCard 
                    key={mesId}
                    mes={mes}
                    anio={2026}
                    cursosPlaneados={cursosDelMes}
                    onPlanificar={() => handleOpenDialog(index)}
                    isLoading={isLoading}
                />
            )
        })}
      </motion.div>
      
      <Dialog open={!!activeMonth} onOpenChange={() => setActiveMonth(null)}>
        <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle className="text-2xl">Planificar {activeMonth && MESES[parseInt(activeMonth.split('-')[1]) - 1]}</DialogTitle>
                <DialogDescription>
                    Selecciona todos los cursos que se impartirán durante este mes.
                </DialogDescription>
                <div className="relative pt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar curso..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden py-4">
                <ScrollArea className="h-full">
                    <div className="space-y-3 pr-4">
                        {filteredCursosDialog.map(curso => (
                            <div key={curso.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent transition-colors">
                                <Checkbox
                                    id={`check-${activeMonth}-${curso.id}`}
                                    checked={selectedCursos.has(curso.id_curso)}
                                    onCheckedChange={() => handleCursoToggle(curso.id_curso)}
                                />
                                <Label htmlFor={`check-${activeMonth}-${curso.id}`} className="text-sm font-normal cursor-pointer flex-1">
                                    {curso.nombre_oficial}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setActiveMonth(null)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2 h-4 w-4"/>}
                    Guardar Plan
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

