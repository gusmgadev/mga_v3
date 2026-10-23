---
description: Ejecuta una fase del plan (uso: /fase 3)
---
Lee @AGENTS.md, @plan-implementacion.md y @MAP.md.
Ejecuta únicamente la FASE $ARGUMENTS del plan. Si la fase anterior no está marcada como completada en @plan-implementacion.md, avísame antes de empezar.

Jerarquía de conflicto:
1. @AGENTS.md (qué construir)
2. @plan-implementacion.md (cómo construirlo, orden obligatorio)
3. @MAP.md (estado real del sistema)

Reglas de ejecución:
- Consulta primero @MAP.md antes de empezar cualquier tarea.
- Ejecuta las tareas en orden exacto, sin saltarte ninguna y sin replantear el plan.
- No entres en modo de planificación, análisis global ni rediseño.
- No realices pruebas tú mismo: implementa y avísame cuando esté listo para validar.
- Solo pregunta si existe un bloqueo técnico real.
- Mantén los cambios dentro de la fase actual, salvo dependencia directa.

Skills:
- Usa las skills de .agents/skills/ que apliquen a la fase y dime cuáles usaste.
- Si una skill contradice a @AGENTS.md, manda @AGENTS.md.

Seguridad:
- Cumple la sección "Seguridad" de @AGENTS.md y dime cuáles puntos aplican a esta fase.
- Valida siempre en servidor. Ninguna clave en el código. Sin datos personales en logs.
- No instales librerías nuevas sin mi autorización.

Cambios de datos:
- Si la fase cambia el esquema de datos, crea una migración NUEVA (nunca edites las anteriores) y dime exactamente cómo aplicarla.

Reglas SDD:
- Después de cada cambio relevante, actualiza @MAP.md (cambios, módulos, rutas, entidades, decisiones técnicas, impacto).
- No inventes estado en @MAP.md. Si hay discrepancia entre código y mapa, el código tiene prioridad.

Salida esperada:
- Marca cada sub-tarea como completada en @plan-implementacion.md.
- Al finalizar: resume lo implementado, sincroniza @MAP.md, marca la fase como completada e indícame qué debo probar y si hay migraciones por aplicar.
