
'use client';

import React, { useMemo } from 'react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Interfaces básicas para los datos del empleado
interface UserData {
    id_empleado?: string;
}

interface Empleado {
    nombre_completo: string;
    puesto: {
        titulo: string;
        departamento: string;
    };
}

export default function PortalPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // 1. Obtener el ID de empleado desde la colección 'usuarios'
  const userInfoRef = useMemoFirebase(
    () => (user ? doc(firestore, 'usuarios', user.uid) : null),
    [user, firestore]
  );
  const { data: userInfo, isLoading: isUserInfoLoading } = useDoc<UserData>(userInfoRef);

  // 2. Usar el ID de empleado para obtener los detalles de la 'Plantilla'
  const empleadoRef = useMemoFirebase(
    () => (userInfo?.id_empleado ? doc(firestore, 'Plantilla', userInfo.id_empleado) : null),
    [userInfo, firestore]
  );
  const { data: empleado, isLoading: isEmpleadoLoading } = useDoc<Empleado>(empleadoRef);

  const isLoading = isAuthLoading || isUserInfoLoading || isEmpleadoLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando tu portal...</p>
        </div>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-lg text-muted-foreground">
          No se pudo cargar la información de tu perfil. Por favor, contacta a RH.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Bienvenido, {empleado.nombre_completo.split(' ')[0]}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {empleado.puesto.titulo} | {empleado.puesto.departamento}
        </p>
      </div>

      {/* A partir de aquí podemos empezar a añadir las nuevas tarjetas y componentes. */}
      
    </motion.div>
  );
}
