
'use client';

import React, { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Briefcase, BookOpen, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Empleado {
  puesto: {
    titulo: string;
  };
}

interface PerfilPuesto {
  id: string;
  nombre_puesto: string;
  cursos_obligatorios: string[];
}

interface CursoCatalogo {
    id: string;
    id_curso: string;
    nombre_oficial: string;
}

export default function ProgramaPage() {
  const firestore = useFirestore();

  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const perfilesRef = useMemoFirebase(() => collection(firestore, 'perfiles_puesto'), [firestore]);
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  
  const { data: empleados, isLoading: l1 } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: l2 } = useCollection<PerfilPuesto>(perfilesRef);
  const { data: catalogoCursos, isLoading: l3 } = useCollection<CursoCatalogo>(catalogoCursosRef);
  
  const isLoading = l1 || l2 || l3;
  
  const programaData = useMemo(() => {
    if (isLoading || !empleados || !perfiles || !catalogoCursos) return [];
    
    const catalogoMap = new Map(catalogoCursos.map(c => [c.id_curso, c.nombre_oficial]));
    
    const puestosConCursos = perfiles.map(perfil => {
        const cursos = perfil.cursos_obligatorios
            .map(cursoId => catalogoMap.get(cursoId) || `Curso no encontrado (${cursoId})`)
            .sort();
        
        return {
            puesto: perfil.nombre_puesto,
            cursos: cursos,
        };
    }).filter(p => p.cursos.length > 0);
    
    return puestosConCursos.sort((a,b) => a.puesto.localeCompare(b.puesto));
    
  }, [isLoading, empleados, perfiles, catalogoCursos]);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Programa de Capacitación</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Listado de cursos obligatorios por puesto, según la matriz de habilidades.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cursos por Puesto</CardTitle>
          <CardDescription>
            Utiliza esta guía para planificar las capacitaciones mensuales.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Cargando programa...</p>
                </div>
            ) : (
                <ScrollArea className="h-[65vh]">
                    <Accordion type="single" collapsible className="w-full space-y-3 pr-4">
                        {programaData.map(({ puesto, cursos }) => (
                            <AccordionItem value={puesto} key={puesto} className="border-b-0 rounded-lg bg-card/80 border">
                                <AccordionTrigger className="px-4 py-3 text-base font-medium hover:no-underline rounded-t-lg">
                                    <div className="flex items-center gap-3 w-full">
                                        <Briefcase className="h-5 w-5 text-primary" />
                                        <span className="flex-1 text-left">{puesto}</span>
                                        <Badge variant="secondary">{cursos.length} cursos</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul className="list-disc pl-5 space-y-2 mt-2">
                                        {cursos.map(curso => <li key={curso}>{curso}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
