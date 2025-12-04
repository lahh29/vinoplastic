'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { MagicCard } from '@/components/ui/magic-card';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { motion } from 'framer-motion';

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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
        <StarsBackground starColor="#fff" speed={0.5} className="absolute inset-0 z-0"/>
        <div className="relative z-10 flex flex-col items-center text-center text-white p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="mb-8"
            >
                <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                    VinoPlastic
                </h1>
                <p className="mt-2 text-lg text-slate-300">
                    Portal de Recursos Humanos
                </p>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm"
            >
                <Card className="w-full border-white/10 bg-black/20 text-white shadow-2xl backdrop-blur-lg">
                    <CardHeader className="text-center p-6">
                        <CardTitle className="text-white">Control de Acceso</CardTitle>
                        <CardDescription className="text-slate-400">Ingresa tus credenciales</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="email">Correo</Label>
                                <Input 
                                id="email" 
                                type="email" 
                                placeholder="empleado@vinoplastic.com"
                                required 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:ring-primary"
                                />
                            </div>
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input 
                                id="password" 
                                type="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:ring-primary"
                                />
                            </div>
                             <Button onClick={handleLogin} className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">Ingresar</Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    </div>
  );
}
