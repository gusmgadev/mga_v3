# Skills recomendadas (de terceros)

Las skills incluidas en este kit (`seguridad-web` y `fechas-y-zonas-horarias`) ya están en `.agents/skills/`. Esta lista son skills públicas que conviene añadir según el stack.

## Antes de instalar cualquiera
- Lee su `SKILL.md` completo: una skill es una instrucción que el agente va a obedecer.
- Instala solo de fuentes oficiales (Anthropic, Vercel, Supabase u otras de confianza). Evita instaladores de terceros que empaquetan muchas skills a la vez.
- No instales muchas: con 5 o 6 en total es suficiente.
- Ante conflicto con una skill, manda `AGENTS.md`.
- Comprueba en la documentación de tu herramienta en qué carpeta busca las skills y si distingue mayúsculas (el estándar usa `SKILL.md`).

## Útiles para casi cualquier proyecto web
| Skill | Origen | Para qué |
|---|---|---|
| `frontend-design` | Anthropic | Diseño de interfaz distintivo, evitar el aspecto genérico |
| `web-design-guidelines` | Vercel | Auditoría de interfaz: accesibilidad, formularios, modo oscuro |

## Si usas Next.js / React / Supabase
| Skill | Origen | Para qué |
|---|---|---|
| `next-best-practices` | Vercel | App Router, Server Components, caché |
| `react-best-practices` | Vercel | Rendimiento en React |
| `supabase` | Supabase | Uso correcto de Supabase y seguridad básica |
| `supabase-postgres-best-practices` | Supabase | RLS, esquema, índices |

Según el repositorio de Supabase, el comando de instalación es `npx skills add supabase/agent-skills`. Para las demás, usa el README de cada repositorio oficial y confirma el comando actual.

## Crear tus propias skills
Usa `plantillas/SKILL.plantilla.md`. Las mejores skills propias suelen ser las que codifican reglas específicas de tu proyecto (por ejemplo las reglas de negocio de una agenda, o cómo crear un tema visual nuevo).

## Sobre los MCP
El kit no los necesita. Si más adelante conectas alguno, empieza por uno de documentación (por ejemplo Context7), y no conectes herramientas con acceso de escritura a bases de datos con datos reales.
