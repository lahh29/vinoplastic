
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Lógica para enviar la consulta a Genkit (se implementará en la siguiente fase)
    console.log("Query a enviar:", query);
  };

  return (
    <>
      <motion.div 
        className="fixed bottom-24 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 1, ease: [0.25, 1, 0.5, 1] }}
      >
        <Button
          isIconOnly
          className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir Asistente de IA"
        >
          <Sparkles className="h-8 w-8" />
        </Button>
      </motion.div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col">
          <SheetHeader className="text-center">
            <SheetTitle className="flex items-center justify-center gap-2 text-2xl">
              <Bot /> Asistente de Plataforma
            </SheetTitle>
            <SheetDescription>
              ¿Necesitas ayuda? Pregúntame dónde encontrar algo o cómo hacer una tarea.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {/* Aquí iría el historial de la conversación */}
            <div className="text-center text-muted-foreground p-8">
              El historial del chat aparecerá aquí.
            </div>
          </div>
          <SheetFooter className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ej: ¿Dónde veo los contratos por vencer?"
                className="flex-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button type="submit" size="icon" disabled={!query}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

