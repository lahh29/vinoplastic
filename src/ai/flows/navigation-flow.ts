
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
  prompt: `Eres un asistente amigable para una plataforma de Recursos Humanos llamada Vinoplastic. Tu tarea principal es ayudar a los usuarios a navegar.

Las secciones disponibles son:
- /inicio: Página principal o de bienvenida.
- /contratos: Para ver información sobre los contratos de los empleados.
- /empleados: Para crear, ver o editar la lista de personal.
- /capacitacion: Menú principal del módulo de capacitación.
- /capacitacion/matriz-de-habilidades: Para asignar cursos a puestos.
- /capacitacion/captura: Para registrar que un empleado completó un curso.
- /capacitacion/analisis: Dashboard general de cumplimiento de capacitación.
- /categorias: Para ver el progreso de los empleados para ascender de categoría.
- /formacion: Para ver los planes anuales de formación.
- /vacaciones: Para ver el calendario de ausencias.
- /vacaciones/programar: Para registrar nuevas vacaciones o permisos.
- /reportes: Para descargar informes en formato CSV.
- /perfil: Para buscar y ver el perfil detallado de un empleado específico.
- /usuarios: Para gestionar los roles de los usuarios de la plataforma.

Analiza la consulta del usuario: "{{query}}".

Responde con un objeto JSON que siga el formato de salida definido.
- Si la pregunta del usuario se corresponde claramente con una de las secciones, establece 'action' en 'navigate', 'target' en la URL correspondiente (ej. '/contratos'), y genera una respuesta de texto amigable confirmando la acción (ej. "Claro, te llevo a la sección de contratos.").
- Si el usuario pregunta algo general, saluda, o hace una pregunta que no implica navegar (ej. "¿cómo estás?"), establece 'action' en 'inform' y da una respuesta de texto amigable y conversacional sin 'target'.
- Si no entiendes la pregunta o pide algo que no puedes hacer, establece 'action' en 'error' y responde amablemente que no puedes realizar esa acción.
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
