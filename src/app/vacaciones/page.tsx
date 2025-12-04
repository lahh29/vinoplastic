
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, PlusCircle, Building, Briefcase, Plane, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
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

interface DiaFestivo {
    id: string;
    fecha: Timestamp;
    nombre: string;
}

const badgeColors: Record<Vacacion['tipo'], string> = {
    'Vacaciones': 'bg-blue-500 text-white',
    'Permiso': 'bg-yellow-500 text-white',
    'Incapacidad': 'bg-purple-500 text-white',
    'Falta': 'bg-red-500 text-white'
};

const DayWithEvents = ({ date, events }: { date: Date, events: (Vacacion | DiaFestivo)[] }) => {
    return (
        <div className="relative h-full w-full">
            <span>{date.getDate()}</span>
            {events.length > 0 && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {events.slice(0, 3).map((event, index) => (
                        <div key={index} className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            'nombre' in event ? 'bg-orange-500' : badgeColors[event.tipo]
                        )}></div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function VacacionesPage() {
    const firestore = useFirestore();
    const vacacionesRef = useMemoFirebase(() => collection(firestore, 'vacaciones'), [firestore]);
    const diasFestivosRef = useMemoFirebase(() => collection(firestore, 'dias_festivos'), [firestore]);

    const { data: vacaciones, isLoading: loadingVacaciones } = useCollection<Vacacion>(vacacionesRef);
    const { data: diasFestivos, isLoading: loadingFestivos } = useCollection<DiaFestivo>(diasFestivosRef);

    const isLoading = loadingVacaciones || loadingFestivos;
    const today = startOfDay(new Date());

    const eventsByDate = React.useMemo(() => {
        const eventsMap = new Map<string, (Vacacion | DiaFestivo)[]>();

        (vacaciones || []).forEach(vac => {
            const start = vac.fecha_inicio.toDate();
            const end = vac.fecha_fin.toDate();
            for (let d = start; d <= end; d = addDays(d, 1)) {
                const dateKey = d.toISOString().split('T')[0];
                if (!eventsMap.has(dateKey)) eventsMap.set(dateKey, []);
                eventsMap.get(dateKey)!.push(vac);
            }
        });
        
        (diasFestivos || []).forEach(festivo => {
            const dateKey = festivo.fecha.toDate().toISOString().split('T')[0];
            if (!eventsMap.has(dateKey)) eventsMap.set(dateKey, []);
            eventsMap.get(dateKey)!.push(festivo);
        });

        return eventsMap;
    }, [vacaciones, diasFestivos]);
    
    const proximasAusencias = React.useMemo(() => {
        if (!vacaciones) return [];
        const enSieteDias = addDays(today, 7);
        return vacaciones.filter(v => {
            const inicio = v.fecha_inicio.toDate();
            const fin = v.fecha_fin.toDate();
            return isWithinInterval(today, {start: inicio, end: fin}) || (inicio >= today && inicio <= enSieteDias);
        }).sort((a,b) => a.fecha_inicio.toDate().getTime() - b.fecha_inicio.toDate().getTime());
    }, [vacaciones, today]);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Panel de Vacaciones</h1>
                    <p className="mt-2 text-lg text-muted-foreground">
                        Una vista general de las ausencias del personal.
                    </p>
                </div>
                <Link href="/vacaciones/programar">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Programar Ausencia
                    </Button>
                </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-2xl shadow-lg">
                    <CardHeader>
                        <CardTitle>Calendario de Ausencias</CardTitle>
                        <CardDescription>Eventos programados para todo el personal.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            className="p-0"
                            locale={es}
                            components={{
                                Day: ({ date, displayMonth }) => {
                                    const dateKey = date.toISOString().split('T')[0];
                                    const events = eventsByDate.get(dateKey) || [];
                                    return <DayWithEvents date={date} events={events} />;
                                }
                            }}
                            modifiers={{
                                festivo: (diasFestivos || []).map(f => f.fecha.toDate()),
                                vacaciones: (vacaciones || []).flatMap(v => {
                                    const range = [];
                                    for(let d = v.fecha_inicio.toDate(); d <= v.fecha_fin.toDate(); d = addDays(d, 1)) {
                                        range.push(d);
                                    }
                                    return range;
                                })
                            }}
                            modifiersClassNames={{
                                festivo: 'text-orange-500 font-bold',
                                vacaciones: 'bg-blue-100 dark:bg-blue-900/50 rounded-md'
                            }}
                        />
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" />Próximas Ausencias</CardTitle>
                            <CardDescription>Personal fuera en los próximos 7 días.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                                <div className="space-y-3">
                                {isLoading ? <p>Cargando...</p> : proximasAusencias.length > 0 ? proximasAusencias.map(v => (
                                    <div key={v.id} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{v.nombre_empleado.charAt(0)}</div>
                                        <div>
                                            <p className="font-semibold text-sm">{v.nombre_empleado}</p>
                                            <p className="text-xs text-muted-foreground">{format(v.fecha_inicio.toDate(), 'dd MMM')} - {format(v.fecha_fin.toDate(), 'dd MMM')}</p>
                                        </div>
                                        <Badge className={cn("ml-auto text-white", badgeColors[v.tipo])}>{v.tipo}</Badge>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground italic text-center py-8">Nadie fuera próximamente.</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Días Festivos Oficiales</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-40">
                                <div className="space-y-3">
                                    {isLoading ? <p>Cargando...</p> : (diasFestivos || []).map(f => (
                                         <div key={f.id} className="flex items-center gap-3">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                <CalendarIcon size={16}/>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{f.nombre}</p>
                                                <p className="text-xs text-muted-foreground">{format(f.fecha.toDate(), "dd 'de' MMMM", {locale: es})}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
