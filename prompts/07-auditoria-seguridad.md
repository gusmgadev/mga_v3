# Prompt 07: Auditoría de seguridad (antes de publicar y tras cambios grandes)
Modelo recomendado: el más potente que tengas.

Actúa como auditor de seguridad. Lee @AGENTS.md (sección "Seguridad" incluida) y @MAP.md y revisa el proyecto sin modificar nada.

Comprueba:
1. Secretos: no hay claves, contraseñas ni tokens en el código, en el historial reciente ni en el repositorio. .env* está en .gitignore y existe .env.example sin valores reales. Las claves de administrador solo se usan en el servidor.
2. Autenticación y autorización: se verifican en el servidor en cada endpoint o acción protegida, no solo en la interfaz. Cada rol accede solo a lo necesario.
3. Datos: las consultas están parametrizadas y las entradas se validan en el servidor (tipo, longitud, formato). Si hay base de datos con reglas de acceso por fila o por rol, están activas y son correctas.
4. Salida: el contenido de usuarios se sanea antes de mostrarse y no hay usos inseguros de HTML sin sanear.
5. Formularios y endpoints públicos: límite de intentos, protección anti-bots y mensajes genéricos en el login.
6. Archivos: validación de tipo y tamaño, nombres generados, archivos privados con enlaces temporales.
7. Errores y logs: sin detalles internos ni datos personales ni secretos.
8. Cabeceras de seguridad, HTTPS y resultado de la auditoría de dependencias.
9. Datos personales o sensibles: consentimiento, exportación y eliminación de datos, política de conservación y copias de seguridad.
10. Cualquier punto específico de la sección "Seguridad" de @AGENTS.md que no esté cubierto arriba.

Entrega una lista de hallazgos por gravedad (crítico, alto, medio, bajo) con cómo corregir cada uno. No corrijas nada hasta que yo lo confirme.
