---
description: Genera mi lista manual de pruebas para una fase (uso: /probar-fase 3)
agent: plan
---
Lee @AGENTS.md, @plan-implementacion.md y @MAP.md. No modifiques nada.
Genera una lista de comprobación manual para que yo pruebe la FASE $ARGUMENTS, como casillas "- [ ]".

Incluye:
- Los caminos normales de cada funcionalidad de la fase.
- Los casos límite relevantes (campos vacíos, datos duplicados, fechas pasadas, dos acciones a la vez).
- Pruebas como visitante sin sesión (qué NO debería poder ver o hacer), si la fase toca datos o partes públicas.
- Pruebas de permisos: qué pasa sin sesión iniciada y con un usuario de otro rol.
- Pruebas en móvil y en modo claro/oscuro si la fase toca interfaz.
- Qué mirar en @fixes.md si algo falla.

Sé concreto: cada casilla indica la acción y el resultado esperado. No más de 25 casillas.
