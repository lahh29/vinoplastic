
'use client';
import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Target, Lightbulb, User, Users, BookCopy, Save, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface CursoCatalogo {
  id: string;
  id_curso: string;
  nombre_oficial: string;
  tipo?: 'interno' | 'externo';
}

interface PerfilPuesto {
    id: string;
    nombre_puesto: string;
    cursos_obligatorios: string[];
}

export default function EstrategiaPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [objetivos, setObjetivos] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);

  const { data: catalogoCursos, isLoading: isLoadingCursos } = useCollection<CursoCatalogo>(catalogoCursosRef);
  const { data: perfiles, isLoading: isLoadingPerfiles } = useCollection<PerfilPuesto>(perfilesRef);
  
  const isLoading = isLoadingCursos || isLoadingPerfiles;

  const filteredCursos = useMemo(() => {
    if (!catalogoCursos || !perfiles) return [];

    // 1. Crear un Set con todos los ID de cursos que están en uso en los perfiles
    const cursosEnUso = new Set<string>();
    perfiles.forEach(perfil => {
        perfil.cursos_obligatorios.forEach(cursoId => {
            cursosEnUso.add(cursoId);
        });
    });

    // 2. Filtrar el catálogo para incluir solo los cursos en uso y que coincidan con la búsqueda
    return catalogoCursos
      .filter(curso => 
        cursosEnUso.has(curso.id_curso) &&
        curso.nombre_oficial.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a,b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [catalogoCursos, perfiles, searchTerm]);

  const handleTipoChange = async (cursoId: string, tipo: 'interno' | 'externo') => {
    if (!firestore) return;
    setSavingStates(prev => ({...prev, [cursoId]: true}));
    
    const docRef = doc(firestore, 'catalogo_cursos', cursoId);
    try {
        await setDocumentNonBlocking(docRef, { tipo }, { merge: true });
        toast({
            title: "Tipo de curso actualizado",
            className: "bg-green-100 text-green-800 border-green-300",
        });
    } catch(e) {
        toast({ title: "Error al actualizar", variant: 'destructive'});
    } finally {
        setSavingStates(prev => ({...prev, [cursoId]: false}));
    }
  };


  return (
    <div className="space-y-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3"><Target className="h-8 w-8"/>Estrategia y Planificación</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Define tus metas y clasifica los recursos de capacitación para el próximo ciclo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <motion.div initial={{opacity:0, x: -20}} animate={{opacity:1, x:0}} transition={{delay: 0.1}}>
            <Card className="rounded-2xl flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><Lightbulb className="text-amber-400"/>Definir Objetivos SMART</CardTitle>
                    <CardDescription>Establece las metas principales para este ciclo de capacitación.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="space-y-3">
                        <Label htmlFor="objetivos">Objetivos del Trimestre/Año</Label>
                        <Textarea 
                            id="objetivos" 
                            placeholder="Ejemplo: Incrementar en 15% el cumplimiento de capacitación en el área de Producción para el Q3."
                            rows={15}
                            value={objetivos}
                            onChange={(e) => setObjetivos(e.target.value)}
                        />
                        <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4">
                            <p><span className="font-bold">Específico:</span> ¿Qué, quién, dónde?</p>
                            <p><span className="font-bold">Medible:</span> ¿Cuánto, cómo sabrás que lo lograste?</p>
                            <p><span className="font-bold">Alcanzable:</span> ¿Es realista con tus recursos?</p>
                            <p><span className="font-bold">Relevante:</span> ¿Importa para la empresa?</p>
                            <p className="col-span-2"><span className="font-bold">Con Plazo:</span> ¿Para cuándo?</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button><Save className="mr-2 h-4 w-4"/>Guardar Objetivos</Button>
                </CardFooter>
            </Card>
        </motion.div>
        <motion.div initial={{opacity:0, x: 20}} animate={{opacity:1, x:0}} transition={{delay: 0.2}}>
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><BookCopy className="text-primary"/>Clasificación de Cursos</CardTitle>
                    <CardDescription>Determina si cada curso se impartirá de forma interna o si requiere un proveedor externo.</CardDescription>
                     <div className="relative pt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar curso..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 rounded-full"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[450px]">
                        <div className="space-y-4 pr-4">
                            {isLoading ? <div className="text-center p-10"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div> : 
                            filteredCursos.map(curso => (
                                <div key={curso.id} className="p-3 border rounded-lg flex items-center justify-between gap-4">
                                    <Label htmlFor={`curso-${curso.id}`} className="flex-1 font-medium text-sm">{curso.nombre_oficial}</Label>
                                    {savingStates[curso.id] ? <Loader2 className="h-5 w-5 animate-spin"/> :
                                    <RadioGroup
                                        id={`curso-${curso.id}`}
                                        defaultValue={curso.tipo || 'interno'}
                                        onValueChange={(value: 'interno' | 'externo') => handleTipoChange(curso.id, value)}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="interno" id={`interno-${curso.id}`} />
                                            <Label htmlFor={`interno-${curso.id}`} className="flex items-center gap-1.5"><Users size={14}/> Interno</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="externo" id={`externo-${curso.id}`} />
                                            <Label htmlFor={`externo-${curso.id}`} className="flex items-center gap-1.5"><User size={14}/> Externo</Label>
                                        </div>
                                    </RadioGroup>
                                    }
                                </div>
                            ))
                            }
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  );
}
