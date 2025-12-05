
'use server';

/**
 * @fileOverview Un agente de IA para ayudar en la navegación de la plataforma.
 *
 * - navigateToAction - Una función que procesa la consulta del usuario y devuelve una acción de navegación.
 * - NavigateToActionInput - El tipo de entrada para la función navigateToAction.
 * - NavigateToActionOutput - El tipo de retorno para la función navigateToAction.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NavigateToActionInputSchema = z.string();
export type NavigateToActionInput = z.infer<typeof NavigateToActionInputSchema>;

const NavigateToActionOutputSchema = z.object({
    action: z.enum(['navigate', 'inform', 'error']).describe("La acción a realizar: 'navigate' para ir a una página, 'inform' para solo dar texto, 'error' si no se entiende."),
    target: z.string().optional().describe("La URL de destino si la acción es 'navigate'."),
    response: z.string().describe("La respuesta en texto para el usuario.")
});
export type NavigateToActionOutput = z.infer<typeof NavigateToActionOutputSchema>;

export async function navigateToAction(query: NavigateToActionInput): Promise<NavigateToActionOutput> {
  return navigationFlow(query);
}

const navigationPrompt = ai.definePrompt({
  name: 'navigationPrompt',
  input: { schema: NavigateToActionInputSchema },
  output: { schema: NavigateToActionOutputSchema },
  prompt: `Eres un asistente de IA para una plataforma de Recursos Humanos llamada Vinoplastic. Tu objetivo es ayudar a los usuarios a navegar y usar la aplicación.

  Analiza la consulta del usuario y responde estrictamente en el formato JSON de salida.
  
  **SECCIONES DISPONIBLES:**
  - /inicio: Página principal.
  - /contratos: Contratos de los empleados.
  - /empleados: Lista de personal.
  - /capacitacion: Módulo de capacitación.
  - /capacitacion/matriz-de-habilidades: Asignar cursos a puestos.
  - /capacitacion/captura: Registrar cursos completados.
  - /capacitacion/analisis: Dashboard de cumplimiento.
  - /categorias: Progreso de ascensos.
  - /formacion: Planes anuales de formación.
  - /vacaciones: Calendario de ausencias.
  - /vacaciones/programar: Registrar vacaciones o permisos.
  - /reportes: Descargar informes.
  - /perfil: Buscar y ver perfiles de empleados.
  - /usuarios: Gestionar roles de usuario.
  
  **REGLAS DE DECISIÓN:**
  
  1.  **NAVEGACIÓN:** Si el usuario pide ir a una sección, usa la acción 'navigate'.
      - **Ejemplos:** "llévame a empleados", "quiero ver los contratos", "abre la página de perfiles", "vamos a vacaciones".
      - **Respuesta JSON esperada:** \`{"action": "navigate", "target": "/empleados", "response": "Claro, te llevo a la sección de empleados."}\`
  
  2.  **INFORMACIÓN/TAREA:** Si el usuario pregunta cómo hacer algo o dónde encontrar una función, usa la acción 'inform' y sugiere el 'target'.
      - **Ejemplos:** "¿Cómo creo un nuevo empleado?", "¿dónde registro las vacaciones?", "necesito descargar el reporte de plantilla".
      - **Respuesta JSON esperada:** \`{"action": "inform", "target": "/empleados", "response": "Para crear un nuevo empleado, puedes ir a la sección 'Empleados' y usar el botón 'Crear Empleado'. ¿Quieres que te lleve ahora?"}\`
  
  3.  **SALUDO/CONVERSACIÓN:** Si el usuario saluda, agradece o hace una pregunta casual, usa la acción 'inform' sin 'target'.
      - **Ejemplos:** "hola", "gracias", "¿qué tal?", "¿qué puedes hacer?".
      - **Respuesta JSON esperada:** \`{"action": "inform", "response": "¡Hola! Soy tu asistente de Vinoplastic. ¿En qué te puedo ayudar hoy?"}\`
  
  4.  **ERROR/NO ENTENDIDO:** Si la pregunta es ambigua o no se relaciona con la plataforma, usa la acción 'error'.
      - **Ejemplos:** "cuéntame un chiste", "cuál es el clima", "asdfghjkl".
      - **Respuesta JSON esperada:** \`{"action": "error", "response": "Lo siento, no he entendido tu pregunta. Puedo ayudarte a navegar o a encontrar funciones dentro de la plataforma."}\`
  
  **Consulta del usuario:**
  "{{query}}"
  `,
});

const navigationFlow = ai.defineFlow(
  {
    name: 'navigationFlow',
    inputSchema: NavigateToActionInputSchema,
    outputSchema: NavigateToActionOutputSchema,
  },
  async (query) => {
    const { output } = await navigationPrompt(query);
    return output!;
  }
);
