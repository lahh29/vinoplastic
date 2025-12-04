'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Empleado {
  id: string;
  puesto: {
    titulo: string;
  };
}

interface PerfilPuesto {
    id: string;
    nombre_puesto: string;
}

export default function MatrizFaltantePage() {
  const firestore = useFirestore();
  
  const plantillaRef = useMemoFirebase(() => firestore ? collection(firestore, 'Plantilla') : null, [firestore]);
  const perfilesRef = useMemoFirebase(() => firestore ? collection(firestore, 'perfiles_puesto') : null, [firestore]);

  const { data: empleados, isLoading: isLoadingPlantilla } = useCollection<Empleado>(plantillaRef);
  const { data: perfiles, isLoading: isLoadingPerfiles } = useCollection<PerfilPuesto>(perfilesRef);

  const puestosSinMatriz = useMemo(() => {
    if (!empleados || !perfiles) return [];

    const todosLosPuestos = new Set<string>();
    empleados.forEach(emp => {
      if (emp.puesto && emp.puesto.titulo) {
        todosLosPuestos.add(emp.puesto.titulo);
      }
    });

    const puestosConMatriz = new Set<string>();
    perfiles.forEach(perfil => {
        puestosConMatriz.add(perfil.nombre_puesto);
    });

    const faltantes = Array.from(todosLosPuestos).filter(puesto => !puestosConMatriz.has(puesto));
    
    return faltantes.sort();
  }, [empleados, perfiles]);

  const isLoading = isLoadingPlantilla || isLoadingPerfiles;

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><p>Analizando datos...</p></div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-amber-400" />
            Puestos sin Matriz de Habilidades
          </CardTitle>
          <CardDescription>
            Estos puestos existen en la plantilla de empleados pero no tienen cursos obligatorios asignados en la Matriz de Habilidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {puestosSinMatriz.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2 text-red-400 font-medium">
              {puestosSinMatriz.map(puesto => (
                <li key={puesto}>{puesto}</li>
              ))}
            </ul>
          ) : (
            <p className="text-green-400 font-semibold">¡Excelente! Todos los puestos tienen una matriz de habilidades definida.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
