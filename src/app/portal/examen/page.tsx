
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, limit, serverTimestamp, addDoc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UserInfo {
    id_empleado?: string;
}

interface Empleado {
    puesto: { titulo: string; };
}

interface ExamenDefinicion {
    cantidad_preguntas: number;
}

interface Pregunta {
    id: string;
    question: string;
    options: { A: string; B: string; C?: string; D?: string; };
    correctAnswerKey: string;
}

type Respuesta = {
    preguntaId: string;
    respuesta: string;
};

export default function ExamenPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const userInfoRef = useMemoFirebase(() => user ? doc(firestore, 'usuarios', user.uid) : null, [user, firestore]);
  const { data: userInfo } = useDoc<UserInfo>(userInfoRef);

  const slugify = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");

  useEffect(() => {
    const fetchExamen = async () => {
      if (!userInfo?.id_empleado || !firestore) return;

      const empleadoDocRef = doc(firestore, 'Plantilla', userInfo.id_empleado);
      const empleadoSnap = await getDoc(empleadoDocRef);
      if (!empleadoSnap.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Perfil de empleado no encontrado.' });
        router.push('/portal');
        return;
      }
      const empleadoData = empleadoSnap.data() as Empleado;
      const puestoSlug = slugify(empleadoData.puesto.titulo);
      
      const examenDefRef = doc(firestore, 'examenes', puestoSlug);
      const examenDefSnap = await getDoc(examenDefRef);

      if (!examenDefSnap.exists()) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró una definición de examen para tu puesto.' });
        router.push('/portal');
        return;
      }
      const examenDef = examenDefSnap.data() as ExamenDefinicion;
      
      // Lógica para obtener preguntas aleatorias
      const preguntasRef = collection(firestore, 'preguntas_limpias');
      const q = query(preguntasRef);
      const snapshot = await getDocs(q);
      const allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pregunta));
      
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, examenDef.cantidad_preguntas);
      
      setPreguntas(selectedQuestions);
      setIsLoading(false);
    };

    if (userInfo) fetchExamen();
  }, [userInfo, firestore, router, toast]);

  const handleSelectAnswer = (preguntaId: string, respuesta: string) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: respuesta }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    let correctAnswers = 0;
    preguntas.forEach(p => {
        if (respuestas[p.id] === p.correctAnswerKey) {
            correctAnswers++;
        }
    });

    const finalScore = (correctAnswers / preguntas.length) * 100;
    setScore(finalScore);

    if (userInfo?.id_empleado && firestore) {
        const promocionRef = doc(firestore, 'Promociones', userInfo.id_empleado);
        await setDoc(promocionRef, { examen_teorico: finalScore }, { merge: true });

        const intentosRef = collection(promocionRef, 'intentos_examen');
        await addDoc(intentosRef, {
            calificacion: finalScore,
            fecha: serverTimestamp(),
            respuestas: respuestas
        });
    }

    setIsSubmitting(false);
  };
  
  const progress = (currentQuestionIndex / preguntas.length) * 100;
  const currentQuestion = preguntas[currentQuestionIndex];
  
  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-4">Cargando tu examen...</p></div>;
  if (score !== null) return (
    <div className="flex h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
            <CardHeader>
                 <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                    {score >= 70 ? <CheckCircle className="mx-auto h-20 w-20 text-green-500" /> : <XCircle className="mx-auto h-20 w-20 text-red-500" />}
                </motion.div>
                <CardTitle className="text-3xl">Examen Finalizado</CardTitle>
                <CardDescription className="text-base">Tu resultado ha sido guardado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-6xl font-bold">{score.toFixed(0)}<span className="text-2xl text-muted-foreground">/100</span></p>
                <p className="text-muted-foreground">{score >= 70 ? "¡Felicidades! Has aprobado." : "Necesitas volver a intentarlo."}</p>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => router.push('/portal')}>Volver a Mi Portal</Button>
            </CardFooter>
        </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-screen p-4 md:p-8">
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
        <div className="mb-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2 text-center">Pregunta {currentQuestionIndex + 1} de {preguntas.length}</p>
        </div>
        
        <AnimatePresence mode="wait">
            <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
            >
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl leading-relaxed">{currentQuestion?.question}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <RadioGroup
                            value={respuestas[currentQuestion?.id] || ""}
                            onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)}
                            className="space-y-4"
                        >
                            {currentQuestion && Object.entries(currentQuestion.options).map(([key, value]) => (
                                <Label key={key} className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-all">
                                    <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} className="mt-1"/>
                                    <span className="text-base">{value}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-6">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0}>
                <ArrowLeft className="mr-2 h-4 w-4"/> Anterior
            </Button>
            {currentQuestionIndex < preguntas.length - 1 ? (
                <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                    Siguiente <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700" disabled={Object.keys(respuestas).length !== preguntas.length}>
                            <Send className="mr-2 h-4 w-4"/> Finalizar y Calificar
                        </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro de finalizar?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Una vez enviado, tu examen será calificado y no podrás cambiar tus respuestas.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                Sí, enviar examen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>
    </div>
  );
}
