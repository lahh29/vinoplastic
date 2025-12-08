
'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, HelpCircle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Interfaces
interface Pregunta {
    id: string;
    question: string;
    options: { A: string; B: string; C?: string; D?: string; };
    correctAnswerKey: string;
}

const QuestionCard = ({ pregunta }: { pregunta: Pregunta }) => {
    // Encuentra el texto de la respuesta correcta usando la clave
    const correctAnswerText = pregunta.options[pregunta.correctAnswerKey as keyof typeof pregunta.options];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="text-base font-semibold leading-snug">{pregunta.question}</CardTitle>
                </CardHeader>
                <CardContent>
                     {correctAnswerText ? (
                        <div className="p-3 rounded-md bg-green-500/10 border border-green-500/30 text-green-800 dark:text-green-300 flex items-start gap-2">
                             <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="flex-1 text-sm font-medium">{correctAnswerText}</span>
                        </div>
                    ) : (
                         <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span className="flex-1 text-sm font-medium">Respuesta no encontrada.</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}


export default function BancoDePreguntasPage() {
    const firestore = useFirestore();
    const preguntasRef = useMemoFirebase(() => collection(firestore, 'preguntas_limpias'), [firestore]);
    const { data: preguntas, isLoading } = useCollection<Pregunta>(preguntasRef);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPreguntas = useMemo(() => {
        if (!preguntas) return [];
        return preguntas.filter(p => 
            p.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            Object.values(p.options).some(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [preguntas, searchTerm]);

    return (
        <div className="space-y-8">
             <div className="max-w-4xl">
                <h1 className="text-4xl font-bold tracking-tight">Banco de Preguntas</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Consulta, busca y verifica todas las preguntas disponibles para los exámenes de promoción.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Catálogo Completo</CardTitle>
                            <CardDescription>
                                {isLoading ? "Cargando preguntas..." : `${filteredPreguntas.length} de ${preguntas?.length || 0} preguntas.`}
                            </CardDescription>
                        </div>
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar en preguntas y respuestas..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                        {isLoading ? (
                             <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredPreguntas.map(pregunta => (
                                    <QuestionCard key={pregunta.id} pregunta={pregunta} />
                                ))}
                            </div>
                        )}
                         {!isLoading && filteredPreguntas.length === 0 && (
                            <div className="text-center py-20 text-muted-foreground">
                                <HelpCircle className="mx-auto h-12 w-12 opacity-50 mb-4" />
                                <h3 className="text-lg font-semibold">No se encontraron resultados</h3>
                                <p className="text-sm">Intenta con otros términos de búsqueda.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
