
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Bot, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { navigateToAction } from '@/ai/flows/navigation-flow';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage: Message = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
        const result = await navigateToAction(query);

        const botMessage: Message = { sender: 'bot', text: result.response };
        setMessages(prev => [...prev, botMessage]);

        if (result.action === 'navigate' && result.target) {
            setTimeout(() => {
                router.push(result.target!);
                setIsOpen(false);
            }, 1000);
        } else if (result.action === 'error') {
             toast({
                variant: 'destructive',
                title: 'Acción no soportada',
                description: result.response,
            });
        }
    } catch (error) {
        const errorMessage = 'Lo siento, no pude procesar tu solicitud en este momento.';
        setMessages(prev => [...prev, { sender: 'bot', text: errorMessage }]);
        toast({
            variant: 'destructive',
            title: 'Error del Asistente',
            description: 'Hubo un problema al conectar con la IA.',
        });
    } finally {
        setIsLoading(false);
    }
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
          <ScrollArea className="flex-1 p-4">
             <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                  <div className="flex justify-start">
                       <div className="p-3 rounded-2xl bg-secondary flex items-center gap-2">
                           <Loader2 className="h-4 w-4 animate-spin"/>
                           <p className="text-sm italic">Pensando...</p>
                       </div>
                  </div>
              )}
             </div>
          </ScrollArea>
          <SheetFooter className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
              <Input
                type="text"
                placeholder="Ej: ¿Dónde veo los contratos por vencer?"
                className="flex-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!query || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

