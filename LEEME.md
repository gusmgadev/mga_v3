# Kit genérico de desarrollo de aplicaciones con IA

Metodología: **Spec-Driven Development (SDD) por fases** para trabajar solo con un agente de IA (OpenCode, Claude Code u otros) manteniendo el control.
Idea central: primero defines por escrito QUÉ debe hacer el sistema, después el agente lo construye fase por fase, tú pruebas, corriges y haces commit.

## Qué contiene
- `AGENTS.md`: especificación del proyecto + reglas + seguridad (plantilla para rellenar).
- `plan-implementacion.md`: plan por fases con sub-tareas (plantilla; puede generarlo la IA).
- `MAP.md`: mapa del estado real del proyecto (lo actualiza el agente).
- `fixes.md`: errores y mejoras que anotas al probar.
- `prompts/`: los prompts del método, para copiar y pegar en cualquier agente.
- `.opencode/commands/`: los mismos prompts como comandos (`/fase`, `/fixes`...) para OpenCode.
- `.agents/skills/`: skills del proyecto (`seguridad-web`, `fechas-y-zonas-horarias`).
- `plantillas/SKILL.plantilla.md`: plantilla para crear tus propias skills.
- `presets/next-supabase.md`: ejemplo de bloque de stack con reglas de seguridad.
- `skills-recomendadas.md`: skills de terceros y precauciones.

Copia también las carpetas ocultas `.agents/` y `.opencode/` (activa "mostrar archivos ocultos").

## Cómo empezar un proyecto nuevo
1. Crea la carpeta del proyecto, copia dentro todo el kit y ejecuta `git init`.
2. Rellena `AGENTS.md`: descripción, stack, reglas, seguridad y tus módulos con la plantilla de spec. Puedes pedirle a un modelo potente que te ayude a estructurarlo.
3. (Opcional) Lanza `06-revisar-spec` para que lo revise como QA.
4. Lanza `01-crear-plan` (modelo potente) para generar `plan-implementacion.md`. Revísalo: fases pequeñas y verificables.
5. Lanza `00-arrancar-proyecto` (FASE 0). Comprueba que arranca, haz commit.
6. Por cada fase siguiente: `/fase N` (o el prompt 03) -> probar -> anotar en `fixes.md` -> `/fixes` -> `/cerrar-fase N` -> commit.
7. Antes de publicar: `/auditoria` (prompt 07).
8. Funcionalidades nuevas: añádelas a `AGENTS.md` y usa `/nueva-funcionalidad`.

## Comandos (OpenCode)
| Comando | Qué hace | Cambia archivos |
|---|---|---|
| `/fase N` | Ejecuta una fase del plan | Sí |
| `/fixes` | Corrige lo pendiente en fixes.md | Sí |
| `/estado` | Resume dónde estás y qué sigue | No |
| `/cerrar-fase N` | Cierra una fase probada y propone el commit (no lo ejecuta) | Solo documentos |
| `/auditoria` | Auditoría de seguridad, solo informe | No |
| `/probar-fase N` | Genera tu lista manual de pruebas | No |
| `/nueva-funcionalidad X` | Añade fases al plan | El plan |
| `/spec-revisar` | Revisión QA de AGENTS.md | No |
| `/mapa` | Regenera MAP.md | Solo MAP.md |

Los comandos con `agent: plan` son de solo lectura. No llevan modelo fijo: elígelo con `/models`. Comprueba en la documentación de tu versión de OpenCode si la carpeta se llama `commands` o `command`. Los prompts de `prompts/` sirven con cualquier otro agente.

## Qué modelo usar
| Tarea | Tipo de modelo |
|---|---|
| Plan, revisión de la spec, auditoría de seguridad, cambios de datos delicados | El más potente |
| La mayoría de las fases de funcionalidad | Medio |
| Ajustes estéticos, textos, regenerar MAP.md, preguntas del proyecto | Barato |

Los modelos gratuitos pueden servir para tareas mecánicas (inicializar el proyecto, ajustes simples), pero revisa más y no les pegues datos sensibles ni claves.

## Trucos para ahorrar tokens y evitar caos
- Un commit al terminar cada fase (y antes de cualquier comando que cambie archivos).
- Un chat nuevo por fase: `MAP.md` le da el contexto. Compacta el chat si se alarga.
- Mantén `MAP.md` actualizado para que el agente no explore todo el repositorio.
- Define reglas una sola vez en `AGENTS.md` en vez de repetirlas en cada prompt.
- Usa el modelo adecuado para cada tarea.
- Añade "No me expliques nada, avísame cuando termines" para respuestas cortas.

## SDD híbrido vs estricto
- **Híbrido (recomendado para empezar):** describes cada funcionalidad con contexto y detalle de cómo debe verse y sentirse, con reglas claras. Más fluido.
- **Estricto:** lista de funcionalidades más escueta y ordenada, con límites muy claros de lo que el agente puede y no puede tocar. Útil cuando la seguridad pesa mucho.

## Notas
- El fichero de especificación se llama `AGENTS.md`. Si tu herramienta carga automáticamente otro nombre (por ejemplo `CLAUDE.md`), comprueba en su documentación si lee `AGENTS.md`. Los prompts y comandos lo referencian con `@AGENTS.md`, así que funcionan igualmente.
- Las skills, los comandos y los MCP son opcionales: el método funciona solo con los cuatro `.md` y los prompts.
- Estos archivos no se probaron con un agente real: al empezar, comprueba que los comandos y las skills aparecen en tu herramienta.
