---
name: fechas-y-zonas-horarias
description: Manejo correcto de fechas, horas y zonas horarias en aplicaciones (guardar instantes en UTC, zona horaria del negocio o usuario, cambios de hora, formatos de visualización, errores típicos de parseo). Úsala siempre que el código cree, guarde, compare, calcule o muestre fechas u horas, agendas, citas, reservas, vencimientos, recordatorios o calendarios, aunque el usuario no mencione zonas horarias.
---

# Fechas y horas

Los errores de fecha son invisibles hasta que algo cae a la hora equivocada. Aplica estas reglas.

## Almacenamiento
- Los **instantes** (algo que ocurre en un momento exacto) se guardan en UTC con tipo de dato que conserve la zona (por ejemplo `timestamptz` en PostgreSQL).
- La **zona horaria del negocio o usuario** se guarda como nombre IANA (por ejemplo `Europe/Madrid`, `America/Argentina/Buenos_Aires`) y se define en la configuración. Pregunta cuál es antes de decidirla.
- Los **horarios recurrentes** (por ejemplo "lunes 09:00") se guardan como día de la semana + hora local, no en UTC, para que un cambio de hora no los desplace.
- Convierte "fecha local + hora local + zona" a instante en un solo lugar (una función de utilidad) y reutilízala.

## Cálculo
- Compara y resta instantes, nunca cadenas de texto de fecha.
- Cambios de hora: hay horas que no existen y horas que se repiten. Decide y documenta qué hace el sistema en esos casos; pruébalo con un día de cambio de hora.
- Duraciones y descansos se suman sobre el instante, no sobre el reloj local.
- Cuidado con parsear fechas sin hora (`'2026-10-14'`) en JavaScript: se interpretan como UTC y pueden mostrar el día anterior. No uses `toISOString().slice(0,10)` para obtener "hoy" local.
- El servidor decide qué es "hoy" o "pasado", no el reloj del visitante.

## Visualización
- Muestra fechas y horas con la zona correcta y con el formato regional (usa las utilidades internacionales del lenguaje, por ejemplo `Intl.DateTimeFormat`, en vez de formatear a mano).
- Si el usuario puede estar en otra zona, indica a qué zona corresponde la hora mostrada.
- Define y documenta en `MAP.md` el formato elegido (24 horas o AM/PM, orden día/mes/año, primer día de la semana).

## Dependencias
- No instales librerías de fechas sin autorización: las utilidades nativas suelen bastar. Si hace falta una, propónlo con el motivo.

## Pruebas mínimas
- Hora cercana a medianoche (00:30 y 23:30 locales).
- Día de cambio de hora (primavera y otoño).
- Evento que cruza la medianoche.
- Mostrar el mismo evento desde otra zona horaria.
