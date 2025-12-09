
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getAuth } from "firebase/auth";

interface UserAuthHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const useUser = (): UserAuthHookResult => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    let auth;
    try {
        auth = getAuth();
    } catch (e) {
        // Firebase app not initialized, we'll wait for the provider to handle it
        setIsUserLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setIsUserLoading(false);
      },
      (error) => {
        setUserError(error);
        setIsUserLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { user, isUserLoading, userError };
};
