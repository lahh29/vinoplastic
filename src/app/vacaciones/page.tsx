
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, PlusCircle, Building, Plane, User, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { es } from 'date-fns/locale';
import { addDays, isWithinInterval, startOfDay, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interfaces
interface Vacacion {
  id: string;
  id_empleado: string;
  nombre_empleado: string;
  fecha_inicio: Timestamp;
  fecha_fin: Timestamp;
  tipo: 'Vacaciones' | 'Permiso' | 'Incapacidad' | 'Falta';
}

interface Empleado {
    id_empleado: string;
    puesto: {
        departamento: string;
        turno: string;
    };
}

interface DiaFestivo {
    id: string;
    fecha: Timestamp;
    nombre: string;
}

interface AusenciaConDetalle extends Vacacion {
    departamento?: string;
    turno?: string;
}


const badgeColors: Record<Vacacion['tipo'], string> = {
    'Vacaciones': 'bg-primary text-primary-foreground',
    'Permiso': 'bg-yellow-500 text-black',
    'Incapacidad': 'bg-purple-500 text-white',
    'Falta': 'bg-destructive text-destructive-foreground'
};


export default function VacacionesPage() {
    const firestore = useFirestore();
    const vacacionesRef = useMemoFirebase(() => collection(firestore, 'vacaciones'), [firestore]);
    const diasFestivosRef = useMemoFirebase(() => collection(firestore, 'dias_festivos'), [firestore]);
    const plantillaRef = useMemoFirebase(() => collection(firestore, 'Plantilla'), [firestore]);


    const { data: vacaciones, isLoading: loadingVacaciones } = useCollection<Vacacion>(vacacionesRef);
    const { data: diasFestivos, isLoading: loadingFestivos } = useCollection<DiaFestivo>(diasFestivosRef);
    const { data: empleados, isLoading: loadingEmpleados } = useCollection<Empleado>(plantillaRef);


    const isLoading = loadingVacaciones || loadingFestivos || loadingEmpleados;
    const today = startOfDay(new Date());

    const proximasAusencias = React.useMemo(() => {
        if (!vacaciones || !empleados) return [];
        const enSieteDias = addDays(today, 7);
        const empleadosMap = new Map(empleados.map(e => [e.id_empleado, e.puesto]));

        return vacaciones.filter(v => {
            const inicio = v.fecha_inicio.toDate();
            const fin = v.fecha_fin.toDate();
            return isWithinInterval(today, {start: inicio, end: fin}) || (inicio >= today && inicio <= enSieteDias);
        }).map(v => {
            const puesto = empleadosMap.get(v.id_empleado);
            return {
                ...v,
                departamento: puesto?.departamento || 'N/A',
                turno: puesto?.turno || 'N/A'
            }
        }).sort((a,b) => a.fecha_inicio.toDate().getTime() - b.fecha_inicio.toDate().getTime());
    }, [vacaciones, empleados, today]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Panel de Vacaciones</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Una vista general de las ausencias del personal.
                    </p>
                </div>
                <Link href="/vacaciones/programar" data-tour="vacaciones-programar">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Programar Ausencia
                    </Button>
                </Link>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm" data-tour="vacaciones-proximas">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" />Próximas Ausencias</CardTitle>
                        <CardDescription>Personal fuera en los próximos 7 días.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[40vh]">
                            <div className="space-y-4 pr-4">
                            {isLoading ? <p>Cargando...</p> : proximasAusencias.length > 0 ? proximasAusencias.map((v: AusenciaConDetalle) => (
                                <Card key={v.id} className="bg-card/80">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg flex items-center gap-2"><User className="h-4 w-4"/> {v.nombre_empleado}</CardTitle>
                                            <Badge className={cn(badgeColors[v.tipo])}>{v.tipo}</Badge>
                                        </div>
                                         <CardDescription>{v.departamento} | Turno {v.turno}</CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
                                            <CalendarIcon size={16}/> {format(v.fecha_inicio.toDate(), 'dd MMM', {locale: es})} - {format(v.fecha_fin.toDate(), 'dd MMM, yyyy', {locale: es})}
                                        </p>
                                    </CardFooter>
                                </Card>
                            )) : <p className="text-sm text-muted-foreground italic text-center py-16">Nadie fuera próximamente.</p>}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-lg bg-card/60 border-border/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Días Festivos Oficiales</CardTitle>
                        <CardDescription>Días no laborables programados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-[40vh]">
                            <div className="space-y-3 pr-4">
                                {isLoading ? <p>Cargando...</p> : (diasFestivos || []).map(f => (
                                     <div key={f.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-orange-500/10 text-orange-500 flex flex-col items-center justify-center font-bold">
                                            <span className="text-xs -mb-1">{format(f.fecha.toDate(), "MMM", {locale: es})}</span>
                                            <span className="text-lg">{format(f.fecha.toDate(), "dd")}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{f.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{format(f.fecha.toDate(), "EEEE, dd 'de' MMMM", {locale: es})}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
