
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
import { motion, AnimatePresence } from 'framer-motion';

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
    <AnimatePresence>
      {isIdle && (
        <AlertDialog open={isIdle}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80"
          />
          <AlertDialogContent asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card/80 backdrop-blur-lg border-border/50 rounded-2xl"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-2xl font-bold">
                  <Timer className="h-7 w-7 text-primary" />
                  ¿Sigues ahí?
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2 text-base">
                  Tu sesión está a punto de cerrarse por inactividad. Serás desconectado en {countdown} segundos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Progress value={(countdown / (DIALOG_TIMEOUT / 1000)) * 100} className="w-full h-2" />
              </div>
              <AlertDialogFooter>
                <Button variant="ghost" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión Ahora
                </Button>
                <AlertDialogAction onClick={handleStay} className="bg-primary hover:bg-primary/90">
                  Permanecer Conectado
                </AlertDialogAction>
              </AlertDialogFooter>
            </motion.div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </AnimatePresence>
  );
}
