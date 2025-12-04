'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignIn(auth, email, password);
  };
  
  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/inicio');
    }
  }, [user, isUserLoading, router]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-none p-0 shadow-none bg-transparent">
        <MagicCard
          gradientColor="hsl(var(--primary))"
          className="p-0"
        >
          <CardHeader className="border-border border-b p-6 pb-4 text-center">
            <div className="flex justify-center mb-4">
                <Logo className="text-white" />
            </div>
            <CardTitle>Acceso a la Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nombre@ejemplo.com"
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-border border-t p-6 pt-4">
            <Button onClick={handleLogin} className="w-full">Iniciar Sesión</Button>
          </CardFooter>
        </MagicCard>
      </Card>
    </div>
  );
}
