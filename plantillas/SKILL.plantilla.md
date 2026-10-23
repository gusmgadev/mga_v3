---
name: nombre-en-minusculas-con-guiones
description: Qué hace la skill Y cuándo usarla. Sé explícito con los casos de uso: lista las situaciones, archivos, fases o palabras que deben activarla, incluso cuando el usuario no nombre la skill. Esta descripción es lo que el agente lee siempre para decidir si la activa.
---

# Título de la skill

Una línea que explique el objetivo. Aclara que AGENTS.md manda si hay conflicto.

## Reglas que no se rompen
1. [Regla concreta y verificable]
2. [Regla concreta y verificable]

## Lista de comprobación
- [ ] [Algo que se pueda verificar]
- [ ] [Otra comprobación]

## Casos límite
- [Situación rara que debes probar o dejar lista para probar]

## Al terminar
Resume qué puntos aplicaban y cuáles quedan pendientes. No afirmes algo como comprobado si no lo verificaste.

---
Cómo usar esta plantilla:
1. Crea la carpeta .agents/skills/<nombre>/ y guarda este archivo como SKILL.md dentro.
2. El nombre de la carpeta debe coincidir con el campo name.
3. Mantén el cuerpo por debajo de unas 500 líneas. Explica el porqué de las reglas, no solo órdenes.
4. Prueba: pide al agente que liste las skills y luego una tarea que debería activarla.
5. Borra esta sección de instrucciones.
