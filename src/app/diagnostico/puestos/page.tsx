'use client';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Empleado {
  id: string;
  puesto: {
    titulo: string;
  };
}

export default function PuestosUnicosPage() {
  const firestore = useFirestore();
  const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);
  const { data: empleados, isLoading } = useCollection<Empleado>(plantillaRef);

  const puestosUnicos = useMemo(() => {
    if (!empleados) return [];
    const puestos = new Set<string>();
    empleados.forEach(emp => {
      if (emp.puesto && emp.puesto.titulo) {
        puestos.add(emp.puesto.titulo);
      }
    });
    return Array.from(puestos).sort();
  }, [empleados]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Cargando puestos...</p></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Listado de Puestos Únicos</CardTitle>
        </CardHeader>
        <CardContent>
          {puestosUnicos.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {puestosUnicos.map(puesto => (
                <li key={puesto}>{puesto}</li>
              ))}
            </ul>
          ) : (
            <p>No se encontraron puestos para mostrar.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
