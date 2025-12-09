
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
import { Loader2, Zap, AlertCircle, Sparkles } from 'lucide-react';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ShinyButton } from '@/components/ui/shiny-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
        <StarsBackground speed={0.5} className="absolute inset-0 z-0"/>

        <div className="absolute top-4 left-4 z-10">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Sparkles className="h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs bg-card/80 backdrop-blur-lg text-center p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Equipo de Desarrollo</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="text-center">
                            <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-primary">
                                <AvatarImage src="https://github.com/LeoHdez.png" alt="Leonardo Hernández" />
                                <AvatarFallback>LH</AvatarFallback>
                            </Avatar>
                            <p className="font-bold">Leonardo Hernández</p>
                            <p className="text-sm text-muted-foreground">Developer</p>
                        </div>
                        <div className="text-center">
                            <Avatar className="w-20 h-20 mx-auto mb-2 border-2 border-primary">
                                <AvatarImage src="https://github.com/Noemi-H.png" alt="Noemi Hernández" />
                                <AvatarFallback>NH</AvatarFallback>
                            </Avatar>
                            <p className="font-bold">Noemi Hernández</p>
                            <p className="text-sm text-muted-foreground">Team</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>


        <div className="relative z-10 flex flex-col items-center text-center p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground">
                    VIÑOPLASTIC
                </h1>
                <p className="mt-0 text-lg text-muted-foreground">
                    Portal de Recursos Humanos
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
                className="w-full max-w-sm"
            >
                <Card className="w-full bg-card/30 border-border/50 shadow-3xl backdrop-blur-lg p-6 sm:p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold">Control de Acceso</h2>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-3">
                      <div className="grid gap-2 text-left">
                          <Label htmlFor="email" className="text-muted-foreground">Correo Electrónico</Label>
                          <Input 
                              id="email" 
                              type="email" 
                              placeholder="usuario@vinoplastic.com"
                              required 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="bg-background/50 border-border/50 placeholder:text-muted-foreground focus:ring-primary rounded-md"
                          />
                      </div>
                      <div className="grid gap-2 text-left">
                          <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
                          <Input 
                              id="password" 
                              type="password" 
                              required 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="bg-background/50 border-border/50 placeholder:text-muted-foreground focus:ring-primary rounded-md"
                          />
                      </div>
                      <Button type="submit" className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Ingresar'}
                      </Button>
                      <div className="pt-1 text-center text-sm">
                        <Link href="/activar" className="text-muted-foreground hover:text-primary hover:underline transition-colors">
                            ¿Eres empleado? Activa tu cuenta aquí.
                        </Link>
                      </div>
                       <div className="text-center text-sm pt-1">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
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
        <div className="absolute bottom-4 right-4 z-10 text-xs text-muted-foreground">
            Copyright ViñoPlastic Inyección S.A de C.V
        </div>
    </div>
  );
}
