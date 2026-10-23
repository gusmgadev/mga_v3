---
description: Cierra una fase ya probada y propone el commit (uso: /cerrar-fase 3)
---
Voy a cerrar la FASE $ARGUMENTS porque ya la probé y funciona.
Lee @MAP.md, @plan-implementacion.md y @fixes.md.

Haz esto:
1. Comprueba que todas las sub-tareas de la fase están marcadas en @plan-implementacion.md y dime si falta alguna.
2. Sincroniza @MAP.md con el estado real del código (si hay discrepancia, gana el código).
3. Lista las migraciones de esta fase y confirma que constan en @MAP.md.
4. Repasa la sección "Seguridad" de @AGENTS.md y dime qué puntos aplicaban a esta fase y cuáles quedan pendientes.
5. Confirma que no quedan fixes pendientes de esta fase en @fixes.md.
6. Propón un mensaje de commit corto con el formato "Fase N: descripción".

No ejecutes git commit: solo propón el mensaje. No cambies código.
