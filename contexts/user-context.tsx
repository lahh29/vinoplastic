// contexts/user-context.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { doc } from 'firebase/firestore';
import { useUser as useFirebaseUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { UserData, UserRole } from '@/components/auth/auth-guard';

// ============================================
// TIPOS
// ============================================

interface UserContextValue {
  // Estado de autenticación
  firebaseUser: ReturnType<typeof useFirebaseUser>['user'];
  isAuthLoading: boolean;
  isAuthInitialized: boolean;
  
  // Datos del usuario
  userData: UserData | null;
  isUserDataLoading: boolean;
  userDataError: Error | null;
  
  // Helpers
  isAuthenticated: boolean;
  isFullyLoaded: boolean;
  role: UserRole | null;
  requiresPasswordChange: boolean;
}

// ============================================
// CONTEXTO
// ============================================

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading, isInitialized } = useFirebaseUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'usuarios', user.uid) : null),
    [user?.uid, firestore]
  );

  const { 
    data: userData, 
    isLoading: isUserDataLoading, 
    error: userDataError 
  } = useDoc<UserData>(userDocRef);

  const value: UserContextValue = {
    firebaseUser: user,
    isAuthLoading,
    isAuthInitialized: isInitialized,
    userData: userData || null,
    isUserDataLoading,
    userDataError,
    isAuthenticated: !!user,
    isFullyLoaded: isInitialized && !isAuthLoading && (!user || !isUserDataLoading),
    role: userData?.role || null,
    requiresPasswordChange: userData?.requiresPasswordChange ?? false,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useCurrentUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return context;
}

/**
 * Hook que solo retorna el usuario si está completamente cargado.
 * Lanza error si se usa antes de que esté listo.
 */
export function useRequiredUser(): { user: UserData; role: UserRole } {
  const { userData, isFullyLoaded, role } = useCurrentUser();
  
  if (!isFullyLoaded) {
    throw new Error('User data is still loading');
  }
  
  if (!userData || !role) {
    throw new Error('No authenticated user');
  }
  
  return { user: userData, role };
}