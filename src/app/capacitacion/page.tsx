
'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { BookMarked, BarChart3, Briefcase, ClipboardPlus, BookCopy } from 'lucide-react';
import { motion } from 'framer-motion';

const navLinks = [
    { href: "/capacitacion/matriz-de-habilidades", icon: BookMarked, title: "Matriz de Habilidades", tourId: "capacitacion-matriz" },
    { href: "/capacitacion/captura", icon: ClipboardPlus, title: "Captura de Cursos", tourId: "capacitacion-captura" },
    { href: "/capacitacion/analisis", icon: BarChart3, title: "Análisis de Cumplimiento", tourId: "capacitacion-analisis" },
    { href: "/capacitacion/analisis-por-puesto", icon: Briefcase, title: "Análisis por Puesto", tourId: "capacitacion-por-puesto" },
    { href: "/capacitacion/analisis-por-curso", icon: BookCopy, title: "Análisis por Curso", tourId: "capacitacion-por-curso" },
]

export default function CapacitacionPage() {
  return (
    <div className="space-y-8">
       <div className="max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight">Módulo de Capacitación</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Gestiona y analiza las capacitaciones del personal.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {navLinks.map((item) => (
             <Link key={item.href} href={item.href} className="block hover:no-underline group" data-tour={item.tourId}>
                <motion.div
                    whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-full"
                >
                    <Card className="h-full flex flex-col items-center justify-center text-center p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-card/60 border-border/50 hover:border-primary/50 backdrop-blur-sm">
                        <motion.div
                            whileHover={{ rotateY: 180, transition: { duration: 0.5 } }}
                            className="text-primary mb-4"
                            style={{ perspective: 800 }}
                        >
                            <item.icon className="h-12 w-12" />
                        </motion.div>
                        <CardTitle className="text-xl font-semibold">
                            {item.title}
                        </CardTitle>
                    </Card>
                </motion.div>
            </Link>
        ))}
      </div>
    </div>
  );
}
