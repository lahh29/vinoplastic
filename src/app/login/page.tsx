
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
import { Loader2, Zap, AlertCircle, Code, PaintBrush } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';

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
                      <div className="pt-1 text-center text-sm">
                        <Link href="/activar" className="text-slate-300 hover:text-primary hover:underline transition-colors">
                            ¿Eres empleado? Activa tu cuenta aquí.
                        </Link>
                      </div>
                       <div className="text-center text-sm pt-1">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="text-xs text-slate-400 hover:text-primary hover:underline transition-colors">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-card/80 backdrop-blur-lg">
                                    <DialogHeader className="items-center text-center">
                                        <div className="p-3 bg-amber-400/10 rounded-full w-fit mb-2">
                                            <AlertCircle className="h-8 w-8 text-amber-400" />
                                        </div>
                                        <DialogTitle className="text-xl">Recuperación de Contraseña</DialogTitle>
                                        <DialogDescription className="pt-2 text-base">
                                            Para restablecer tu contraseña, por favor acude personalmente al departamento de Recursos Humanos.
                                        </DialogDescription>
                                    </DialogHeader>
                                </DialogContent>
                            </Dialog>
                        </div>
                  </form>
                </Card>
            </motion.div>
        </div>
         <div className="absolute bottom-4 left-4 z-10">
            <Dialog>
                <DialogTrigger asChild>
                    <InteractiveHoverButton>
                        <Zap className="h-5 w-5 text-neutral-400 transition-colors duration-300 group-hover:text-neutral-50" />
                    </InteractiveHoverButton>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs rounded-3xl p-0 overflow-hidden bg-transparent border-none shadow-2xl">
                     <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                        className="bg-gradient-to-br from-slate-900 via-black to-slate-900 p-8 text-center text-white"
                      >
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Equipo de Desarrollo</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center gap-8 my-6">
                            <motion.div whileHover={{scale: 1.1}} className="flex flex-col items-center gap-2">
                                <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600"><Code className="h-6 w-6 text-white"/></div>
                                <span className="text-xs font-bold uppercase tracking-wider">Developer</span>
                                <span className="text-sm text-slate-300">Hernández Leonardo</span>
                            </motion.div>
                             <motion.div whileHover={{scale: 1.1}} className="flex flex-col items-center gap-2">
                                <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-rose-500"><PaintBrush className="h-6 w-6 text-white"/></div>
                                <span className="text-xs font-bold uppercase tracking-wider">Team</span>
                                <span className="text-sm text-slate-300">Hernández Noemi</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </DialogContent>
            </Dialog>
        </div>
        <div className="absolute bottom-4 right-4 z-10 text-xs text-slate-500">
            Copyright ViñoPlastic Inyección S.A de C.V
        </div>
    </div>
  );
}
