# Prompt 03: Ejecutar una fase (se repite en cada fase)
Modelo recomendado: medio (potente si la fase es grande o compleja).
Cambia solo los números de fase.

He terminado la FASE 0.
Ahora procede a hacer la FASE 1.

Contexto:
- Especificación en @AGENTS.md (fuente de verdad funcional)
- Plan de implementación en @plan-implementacion.md (orden de ejecución obligatorio)
- Estado actual del sistema en @MAP.md (fuente de verdad del estado real)
- Debes seguir el plan de implementación estrictamente, sin replantearlo.

Jerarquía de conflicto:
1. @AGENTS.md (qué construir)
2. @plan-implementacion.md (cómo construirlo)
3. @MAP.md (estado actual del sistema)

Reglas de ejecución:
- Consulta primero @MAP.md antes de empezar cualquier tarea.
- Ejecuta las tareas en orden exacto, sin saltarte ninguna.
- No entres en modo de planificación, análisis global ni rediseño.
- No realices pruebas tú mismo: implementa y avísame cuando esté listo para validar.
- Solo pregunta si existe un bloqueo técnico real.
- Mantén los cambios dentro de la fase actual, salvo dependencia directa.

Skills:
- Usa las skills de .agents/skills/ que apliquen a la fase y dime cuáles usaste.
- Si una skill contradice a @AGENTS.md, manda @AGENTS.md.

Reglas de seguridad:
- Cumple la sección "Seguridad" de @AGENTS.md y dime cuáles puntos aplican a esta fase.
- Valida siempre en servidor. Ninguna clave en el código. Sin datos personales en logs.
- No instales librerías nuevas sin mi autorización.

Cambios de datos:
- Si la fase necesita cambios en el esquema de datos, crea una migración NUEVA (nunca edites las anteriores) y dime exactamente cómo aplicarla.

Reglas SDD:
- Después de cada cambio relevante, actualiza @MAP.md (cambios, nuevos módulos/rutas/entidades, decisiones técnicas, impacto).
- No inventes estado en @MAP.md. Si hay discrepancia entre código y mapa, el código tiene prioridad y el mapa se corrige.

Salida esperada:
- Marca cada sub-tarea como completada en @plan-implementacion.md.
- Al finalizar: resume lo implementado, sincroniza @MAP.md, marca la fase como completada e indícame qué debo probar y si hay migraciones por aplicar.
