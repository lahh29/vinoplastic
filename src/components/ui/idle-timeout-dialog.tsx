
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { useAuth } from '@/firebase';
import { LogOut, Timer } from 'lucide-react';

const IDLE_TIMEOUT = 5 * 1000; // 5 segundos para prueba
const DIALOG_TIMEOUT = 10 * 1000; // 10 segundos para prueba

export function IdleTimeoutDialog() {
  const auth = useAuth();
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(DIALOG_TIMEOUT / 1000);
  const intervalRef = useRef<NodeJS.Timeout>();

  const handleIdle = useCallback(() => {
    setIsIdle(true);
  }, []);

  useIdleTimer({ onIdle: handleIdle, timeout: IDLE_TIMEOUT });

  const handleLogout = useCallback(() => {
    if (auth) {
      auth.signOut();
    }
  }, [auth]);

  const handleStay = () => {
    setIsIdle(false);
    setCountdown(DIALOG_TIMEOUT / 1000);
  };

  useEffect(() => {
    if (isIdle) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isIdle, handleLogout]);

  return (
    <AlertDialog open={isIdle}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Timer className="h-6 w-6" />
            ¿Sigues ahí?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tu sesión está a punto de cerrarse por inactividad.
            Serás desconectado en {countdown} segundos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Progress value={(countdown / (DIALOG_TIMEOUT / 1000)) * 100} className="w-full" />
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
          <AlertDialogAction onClick={handleStay}>
            Permanecer Conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
