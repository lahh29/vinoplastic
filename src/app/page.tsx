'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/firebase';

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/inicio');
      } else {
        router.replace('/login');
      }
    }
  }, [router, user, isUserLoading]);

  return (
    <div className="flex h-screen items-center justify-center">
        <p>Cargando...</p>
    </div>
  );
}
