
'use client';

import * as React from 'react';
import {
  Bell,
  FileClock,
  AlertTriangle,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRoleCheck } from '@/hooks/use-role-check';


// Interfaces para notificaciones
interface Contrato {
  id: string;
  nombre_completo: string;
  indeterminado?: boolean;
  fechas_contrato: {
    termino: Timestamp;
  };
  evaluaciones?: {
    primera: { fecha_programada: Timestamp; estatus: string };
    segunda: { fecha_programada: Timestamp; estatus: string };
    tercera: { fecha_programada: Timestamp; estatus: string };
  };
}

const getDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    const date = new Date(timestamp);
    return isValid(date) ? date : null;
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'N/A';
  const date = getDate(timestamp);
  if (!date || !isValid(date)) return 'Fecha inválida';
  return format(date, 'dd/MMM/yy', { locale: es });
};

// Componente de notificaciones
export function Notifications() {
  const firestore = useFirestore();
  const { isAdmin, isLector } = useRoleCheck();
  const canReadData = isAdmin || isLector;

  const contratosRef = useMemoFirebase(() => (firestore && canReadData) ? collection(firestore, 'Contratos') : null, [firestore, canReadData]);
  const { data: contratos, isLoading } = useCollection<Contrato>(contratosRef);
  
  const notifications = React.useMemo(() => {
    if (!contratos || isLoading || !canReadData) {
      return { expiringContracts: [], dueEvaluations: [], count: 0 };
    }

    const today = new Date();
    const fifteenDaysFromNow = addDays(today, 15);
    const sevenDaysFromNow = addDays(today, 7);

    const expiring = contratos.filter(c => {
        if (c.indeterminado) return false;
        const termDate = getDate(c.fechas_contrato?.termino);
        return termDate && termDate >= today && termDate <= fifteenDaysFromNow;
    });
    
    const evaluationsDue: {contrato: Contrato, fecha: string, tipo: string}[] = [];
    contratos.forEach(c => {
        if (!c.evaluaciones) return;
        const eval1Date = getDate(c.evaluaciones.primera?.fecha_programada);
        const eval2Date = getDate(c.evaluaciones.segunda?.fecha_programada);
        const eval3Date = getDate(c.evaluaciones.tercera?.fecha_programada);

        if (eval1Date && eval1Date >= today && eval1Date <= sevenDaysFromNow && c.evaluaciones.primera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.primera.fecha_programada), tipo: 'Primera' });
        }
        if (eval2Date && eval2Date >= today && eval2Date <= sevenDaysFromNow && c.evaluaciones.segunda.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.segunda.fecha_programada), tipo: 'Segunda' });
        }
        if (eval3Date && eval3Date >= today && eval3Date <= sevenDaysFromNow && c.evaluaciones.tercera.estatus === 'Pendiente') {
            evaluationsDue.push({ contrato: c, fecha: formatDate(c.evaluaciones.tercera.fecha_programada), tipo: 'Tercera' });
        }
    });

    return {
      expiringContracts: expiring.sort((a,b) => (getDate(a.fechas_contrato.termino)?.getTime() ?? 0) - (getDate(b.fechas_contrato.termino)?.getTime() ?? 0)),
      dueEvaluations: evaluationsDue.sort((a,b) => (getDate(a.contrato.evaluaciones.primera.fecha_programada)?.getTime() ?? 0) - (getDate(b.contrato.evaluaciones.primera.fecha_programada) ?? new Date(0)).getTime()),
      count: expiring.length + evaluationsDue.length,
    };
  }, [contratos, isLoading, canReadData]);

  if (!canReadData) {
    return null; // No mostrar el icono de notificaciones para empleados
  }

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-9 md:w-9">
                  <Bell className="h-5 w-5" />
                  {notifications.count > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                  <span className="sr-only">Notificaciones</span>
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Notificaciones</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Notificaciones</DialogTitle>
          <DialogDescription>
            Alertas importantes sobre contratos y evaluaciones del personal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive"/> Contratos por Vencer
            </h4>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                  {notifications.expiringContracts.length > 0 ? (
                  notifications.expiringContracts.map(c => (
                      <div key={c.id} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="font-semibold text-sm">{c.nombre_completo}</p>
                      <p className="text-xs text-destructive">Vence: {formatDate(c.fechas_contrato.termino)}</p>
                      </div>
                  ))
                  ) : <div className="flex h-full items-center justify-center"><p className="p-2 text-sm text-muted-foreground italic">Nada por aquí.</p></div>}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <FileClock className="h-4 w-4 text-primary"/> Evaluaciones Próximas
            </h4>
            <ScrollArea className="h-64 pr-4">
                <div className="space-y-3">
                    {notifications.dueEvaluations.length > 0 ? (
                    notifications.dueEvaluations.map((item: any) => (
                        <div key={item.contrato.id + item.tipo} className="p-3 bg-secondary/50 rounded-lg">
                        <p className="font-semibold text-sm">{item.contrato.nombre_completo}</p>
                        <p className="text-xs text-primary">
                            {item.tipo} evaluación antes del: {item.fecha}
                        </p>
                        </div>
                    ))
                    ) : <div className="flex h-full items-center justify-center"><p className="p-2 text-sm text-muted-foreground italic">Todo al día.</p></div>}
                </div>
            </ScrollArea>
          </div>
        </div>
      {notifications.count === 0 && <p className="py-8 text-center text-sm text-muted-foreground">¡Sin notificaciones pendientes!</p>}
      </DialogContent>
    </Dialog>
  )
}
