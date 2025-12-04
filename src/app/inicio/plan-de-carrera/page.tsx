
'use client';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ReglaAscenso {
    id: string;
    puesto_actual: string;
    puesto_siguiente: string;
    meses_minimos: number;
    min_evaluacion_desempeno: number;
    min_examen_teorico?: number;
    min_cobertura_matriz: number;
    orden_jerarquico: number;
}


export default function PlanDeCarreraPage() {
    const firestore = useFirestore();
    const reglasAscensoRef = useMemoFirebase(() => collection(firestore, 'reglas_ascenso'), [firestore]);
    const { data: reglasAscenso, isLoading } = useCollection<ReglaAscenso>(reglasAscensoRef);

    const groupedRules = useMemo(() => {
        if (!reglasAscenso) return {};

        const groups: Record<string, ReglaAscenso[]> = {};

        // Extraer el nombre base del puesto (ej: "OPERADOR DE ACABADOS GP-12")
        const getBaseJob = (puesto: string) => {
          const match = puesto.match(/^(.*)\s[A-E]$/);
          return match ? match[1] : puesto;
        };

        reglasAscenso.forEach(regla => {
            const baseJob = getBaseJob(regla.puesto_actual);
            if (!groups[baseJob]) {
                groups[baseJob] = [];
            }
            groups[baseJob].push(regla);
        });

        // Ordenar las reglas dentro de cada grupo por jerarquía
        for (const job in groups) {
            groups[job].sort((a, b) => (b.orden_jerarquico || 0) - (a.orden_jerarquico || 0));
        }

        return groups;

    }, [reglasAscenso]);

  return (
    <div className="space-y-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Plan de Carrera y Promociones</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Consulta los criterios y requisitos necesarios para los cambios de categoría en cada puesto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lógica de Promociones por Puesto</CardTitle>
          <CardDescription>
            Aquí se detalla el plan de carrera para cada puesto con categorías. La información se obtiene en tiempo real de la base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Cargando reglas de promoción...</p> :
            <Accordion type="single" collapsible className="w-full space-y-4">
              {Object.entries(groupedRules).sort(([jobA], [jobB]) => jobA.localeCompare(jobB)).map(([puestoBase, reglas]) => (
                <AccordionItem value={puestoBase} key={puestoBase} className="border rounded-lg">
                  <AccordionTrigger className="px-6 py-4 text-lg font-medium hover:no-underline rounded-t-lg">
                    {puestoBase}
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría Actual</TableHead>
                            <TableHead>Promoción a</TableHead>
                            <TableHead>Tiempo Mínimo</TableHead>
                            <TableHead>Eval. Desempeño</TableHead>
                            <TableHead>Examen Teórico</TableHead>
                            <TableHead>% Cobertura Matriz</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reglas.map((regla) => {
                            const categoriaActualMatch = regla.puesto_actual.match(/\s([A-E])$/);
                            const categoriaActual = categoriaActualMatch ? categoriaActualMatch[1] : 'N/A';

                            const categoriaSiguienteMatch = regla.puesto_siguiente.match(/\s([A-E])$/);
                            const categoriaSiguiente = categoriaSiguienteMatch ? categoriaSiguienteMatch[1] : regla.puesto_siguiente;

                            return (
                                <TableRow key={regla.id}>
                                <TableCell><Badge variant="secondary" className="font-semibold text-base">{categoriaActual}</Badge></TableCell>
                                <TableCell>
                                    {regla.puesto_siguiente === "Máxima Categoría" ? 
                                        (<Badge variant="default" className="bg-green-500">{regla.puesto_siguiente}</Badge>) : 
                                        (<Badge variant="outline" className="font-semibold text-base border-primary/50 text-primary">{categoriaSiguiente}</Badge>)
                                    }
                                </TableCell>
                                <TableCell>{regla.meses_minimos} meses</TableCell>
                                <TableCell>{regla.min_evaluacion_desempeno}</TableCell>
                                <TableCell>{regla.min_examen_teorico ? `≥${regla.min_examen_teorico}%` : 'N/A'}</TableCell>
                                <TableCell>≥{regla.min_cobertura_matriz}%</TableCell>
                                </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          }
        </CardContent>
      </Card>
    </div>
  );
}
