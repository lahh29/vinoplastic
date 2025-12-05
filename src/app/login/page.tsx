
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth && email && password) {
      setIsLoading(true);
      initiateEmailSignIn(auth, email, password);
    }
  };
  
  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/inicio');
    }
  }, [user, isUserLoading, router]);


  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
        <StarsBackground starColor="#fff" speed={0.5} className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex flex-col items-center text-center text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                    VIÑOPLASTIC
                </h1>
                <p className="mt-0 text-lg text-slate-300">
                    Portal de Recursos Humanos
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm"
            >
                <Card className="w-full bg-black/30 border-white/20 text-white shadow-3xl backdrop-blur-lg p-6 sm:p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Control de Acceso</h2>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-3">
                      <div className="grid gap-2 text-left">
                          <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
                          <Input 
                              id="email" 
                              type="email" 
                              placeholder="usuario@vinoplastic.com"
                              required 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:ring-primary rounded-md"
                          />
                      </div>
                      <div className="grid gap-2 text-left">
                          <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                          <Input 
                              id="password" 
                              type="password" 
                              required 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:ring-primary rounded-md"
                          />
                      </div>
                      <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ingresar'}
                      </Button>
                      <div className="pt-4 text-center text-sm">
                        <Link href="/activar" className="text-slate-300 hover:text-primary hover:underline transition-colors">
                            ¿Eres empleado? Activa tu cuenta aquí.
                        </Link>
                      </div>
                  </form>
                </Card>
            </motion.div>
        </div>
    </div>
  );
}
