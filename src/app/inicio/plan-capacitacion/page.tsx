
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Target, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import Link from 'next/link';

const phases = [
  {
    number: 1,
    icon: Search,
    title: "Diagnóstico y Análisis de Brechas",
    subtitle: "El 'Dónde Estamos'",
    description: "Utilizamos los datos de la plataforma para identificar los puestos y cursos con mayor necesidad de atención, creando una lista de prioridades basada en el cumplimiento actual.",
    href: "/inicio/plan-capacitacion/diagnostico"
  },
  {
    number: 2,
    icon: Target,
    title: "Estrategia y Planificación",
    subtitle: "El 'Hacia Dónde Vamos'",
    description: "Definimos objetivos SMART (Específicos, Medibles, Alcanzables, Relevantes, con Plazo) y clasificamos los cursos en internos (acción rápida) y externos (requieren aprobación)."
  },
  {
    number: 3,
    icon: Calendar,
    title: "Ejecución y Seguimiento",
    subtitle: "El 'Cómo lo Hacemos'",
    description: "Creamos un cronograma anual por trimestres. Cada curso impartido se registra en la plataforma, actualizando los dashboards en tiempo real para un seguimiento continuo del progreso."
  },
  {
    number: 4,
    icon: TrendingUp,
    title: "Medición y Ajuste",
    subtitle: "El 'Cómo Mejoramos'",
    description: "Al final de cada ciclo (trimestre), revisamos los resultados contra los objetivos. Analizamos las desviaciones para entender las causas y ajustamos el plan para el siguiente periodo, asegurando la mejora continua."
  },
];

const PhaseCard = ({ phase }: { phase: typeof phases[0] }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: phase.number * 0.1 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col rounded-2xl shadow-lg hover:shadow-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
              <phase.icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{phase.title}</CardTitle>
              <CardDescription className="text-base text-primary font-semibold">{phase.subtitle}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-muted-foreground leading-relaxed">
            {phase.description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
);


export default function PlanAnualCapacitacionPage() {
    return (
        <div className="space-y-12">
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold tracking-tight">Metodología del Plan Anual de Capacitación</h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Un enfoque estratégico en 4 fases para transformar la capacitación en una ventaja competitiva, utilizando los datos y herramientas de la plataforma.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {phases.map(phase => (
                    phase.href ? (
                        <Link href={phase.href} key={phase.number} className="block h-full hover:no-underline">
                            <PhaseCard phase={phase} />
                        </Link>
                    ) : (
                        <PhaseCard key={phase.number} phase={phase} />
                    )
                ))}
            </div>

             <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                <Card className="bg-gradient-to-r from-primary/80 to-primary/90 text-primary-foreground rounded-2xl shadow-2xl">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Sparkles className="h-10 w-10 text-yellow-300" />
                        <div>
                            <CardTitle className="text-2xl">Ciclo de Mejora Continua</CardTitle>
                            <CardDescription className="text-primary-foreground/80">Este proceso convierte la capacitación en un ciclo proactivo que se autoevalúa y mejora constantemente.</CardDescription>
                        </div>
                    </CardHeader>
                </Card>
            </motion.div>
        </div>
    );
}
