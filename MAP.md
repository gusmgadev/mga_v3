# MAP del proyecto: [Nombre]

> Fuente de verdad del estado real. Si el código y este mapa no coinciden, gana el código y se corrige el mapa.
> Estado inicial: proyecto sin iniciar. Todo lo marcado como (planificado) aún no existe.

## Estado actual
- Fase en curso: ninguna (siguiente: FASE 0)
- Última fase completada: ninguna

## Stack
- [Stack real del proyecto]

## Estructura
- `AGENTS.md`: reglas comunes, frontera, seguridad, proceso (fuente normativa).
- `especificacion.md`: funcionalidad — para qué sirve cada módulo/submódulo y sus operaciones (solo funcional).
- `specs/publico.md` / `specs/privado.md`: especificaciones técnicas por zona.
- [carpeta/archivo]: [para qué sirve] (resto: pendiente hasta Fase 0)

## Datos (tablas, entidades, funciones, permisos)
- [nombre]: [descripción breve y quién puede acceder]

## Rutas / endpoints
- Públicos: (pendiente)
- Privados: (pendiente)

## Decisiones técnicas
- (se irán anotando aquí)

## Historial de cambios
- Docs: creado `especificacion.md` (funcional, incluye pública + dashboard 7 módulos + superadmin); `AGENTS.md` ahora referencia 4 piezas con precedencia `AGENTS.md > especificacion.md > specs`.
- Docs: **LandingPage** es módulo de primer nivel (grupo 8, con submódulo Noticias); sale de Administración. Árbol de 8 módulos en `AGENTS.md` §10.1 y `especificacion.md` §3.7/§3.8; `is_admin` concede también `landing_page.*`.
- Docs: `plan-implementacion.md` generado (12 fases: 0 base, 1-8 dashboard en orden Administración→…→LandingPage, 9 superadmin, P1/P2 pública, F go-live); `AGENTS.md` §7 alineado a ese orden.
