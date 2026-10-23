---
description: Auditoría de seguridad completa, solo informe (uso: /auditoria)
agent: plan
---
Actúa como auditor de seguridad. Lee @AGENTS.md (sección "Seguridad" incluida) y @MAP.md y revisa el proyecto sin modificar nada.

Comprueba:
1. Secretos: sin claves, contraseñas ni tokens en el código ni en el repositorio; .env* en .gitignore; claves de administrador solo en el servidor.
2. Autenticación y autorización verificadas en el servidor en cada endpoint o acción protegida; mínimo privilegio por rol.
3. Consultas parametrizadas, entradas validadas en el servidor y reglas de acceso a datos activas y correctas.
4. Contenido de usuarios saneado antes de mostrarse; sin HTML inseguro.
5. Formularios y endpoints públicos con límite de intentos y protección anti-bots; login con mensajes genéricos.
6. Archivos subidos con validación de tipo y tamaño, nombres generados y archivos privados con enlaces temporales.
7. Errores y logs sin detalles internos, datos personales ni secretos.
8. Cabeceras de seguridad, HTTPS y resultado de la auditoría de dependencias.
9. Datos personales o sensibles: consentimiento, exportación y eliminación, política de conservación y copias de seguridad.
10. Cualquier punto específico de la sección "Seguridad" de @AGENTS.md que no esté cubierto arriba.

Entrega una lista de hallazgos por gravedad (crítico, alto, medio, bajo) con cómo corregir cada uno. No corrijas nada hasta que yo lo confirme.
