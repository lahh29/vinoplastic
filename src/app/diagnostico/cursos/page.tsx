'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Curso {
  id: string;
  nombre_oficial: string;
}

export default function CursosUnicosPage() {
  const firestore = useFirestore();
  const catalogoCursosRef = useMemoFirebase(() => collection(firestore, 'catalogo_cursos'), [firestore]);
  const { data: cursos, isLoading } = useCollection<Curso>(catalogoCursosRef);

  const cursosUnicos = useMemo(() => {
    if (!cursos) return [];
    return cursos.sort((a, b) => a.nombre_oficial.localeCompare(b.nombre_oficial));
  }, [cursos]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Cargando cursos...</p></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Listado de Cursos Únicos ({cursosUnicos.length})</CardTitle>
        </CardHeader>
        <CardContent>
           <ScrollArea className="h-[70vh]">
              {cursosUnicos.length > 0 ? (
                <ul className="list-decimal pl-5 space-y-2">
                  {cursosUnicos.map(curso => (
                    <li key={curso.id}>{curso.nombre_oficial}</li>
                  ))}
                </ul>
              ) : (
                <p>No se encontraron cursos para mostrar.</p>
              )}
           </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
