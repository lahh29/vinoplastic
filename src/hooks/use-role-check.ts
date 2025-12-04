
'use client';

import { useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert } from 'lucide-react';

interface UserData {
    role: 'admin' | 'lector' | 'empleado';
}

/**
 * Hook personalizado para verificar el rol del usuario y gestionar permisos.
 * @param {boolean} showToast - Si es true, muestra una notificación toast cuando un no-admin intenta una acción.
 * @returns {{ isAdmin: boolean, isLector: boolean, checkAdminAndExecute: (action: () => void) => void }}
 */
export function useRoleCheck(showToast = true) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const currentUserInfoRef = useMemoFirebase(
    () => (user ? doc(firestore, 'usuarios', user.uid) : null),
    [user, firestore]
  );
  const { data: currentUserData } = useDoc<UserData>(currentUserInfoRef);

  const isAdmin = useMemo(() => currentUserData?.role === 'admin', [currentUserData]);
  const isLector = useMemo(() => currentUserData?.role === 'lector', [currentUserData]);


  const checkAdminAndExecute = (action: () => void) => {
    if (isAdmin) {
      action();
    } else if (showToast) {
      toast({
        title: "Acción no permitida",
        description: "No tienes permisos de administrador para realizar esta acción.",
        variant: 'destructive',
      });
    }
  };

  return { isAdmin, isLector, checkAdminAndExecute };
}
