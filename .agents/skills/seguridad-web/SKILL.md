---
name: seguridad-web
description: Lista de comprobación de seguridad para aplicaciones web (secretos, autenticación y autorización en servidor, validación de entradas, XSS, consultas seguras, formularios públicos, subida de archivos, cabeceras, logs y datos personales). Úsala SIEMPRE que se cree o modifique login, permisos, formularios, endpoints o acciones de servidor, consultas a base de datos, subida de archivos, envío de emails, variables de entorno o cualquier manejo de datos de usuarios, aunque el usuario no mencione la palabra seguridad.
---

# Seguridad web: lista de comprobación

La sección "Seguridad" de `AGENTS.md` es la fuente de verdad del proyecto. Esta skill es la lista operativa. Si hay conflicto, manda `AGENTS.md`. Ante la duda, pregunta antes de implementar.

## Antes de cerrar cualquier tarea, comprueba

### Secretos
- [ ] Ninguna clave, contraseña ni token en el código ni en el repositorio.
- [ ] `.env*` en `.gitignore` y `.env.example` sin valores reales.
- [ ] Las claves con permisos totales solo se usan en el servidor, nunca en código que llegue al navegador.
- [ ] Si una clave se filtró, se regenera.

### Autenticación y autorización
- [ ] Se verifican en el servidor en cada acción o endpoint protegido; el menú oculto no es protección.
- [ ] Mínimo privilegio: cada rol accede solo a lo que necesita.
- [ ] Contraseñas con longitud mínima; segundo factor si el proyecto lo requiere.
- [ ] Mensajes de login genéricos; recuperación de contraseña con la misma respuesta exista o no la cuenta.
- [ ] Cambiar contraseña o email exige la contraseña actual.
- [ ] Cookies de sesión `httpOnly`, `secure` y `sameSite`.

### Datos de entrada y salida
- [ ] Toda entrada se valida en el servidor (tipo, longitud, formato), aunque ya se valide en la interfaz.
- [ ] Consultas siempre parametrizadas; nunca concatenar texto del usuario en una consulta.
- [ ] Todo contenido generado por usuarios se sanea antes de mostrarse. Evitar insertar HTML sin sanear.
- [ ] Los identificadores que se ven en la URL no revelan datos personales (usar ids internos, no teléfonos ni emails).

### Formularios y endpoints públicos
- [ ] Límite de intentos (por IP y por dato clave) y protección anti-bots.
- [ ] Respuestas genéricas: no revelan si un dato ya existía.
- [ ] Límites de longitud y tamaño en todos los campos.

### Archivos
- [ ] Se valida el tipo real y el tamaño; los nombres los genera el sistema.
- [ ] Los archivos privados se sirven con enlaces temporales; los públicos no admiten formatos ejecutables ni SVG sin saneado.

### Aplicación
- [ ] Cabeceras de seguridad en producción (CSP, frame-ancestors, Referrer-Policy, HSTS) y HTTPS forzado.
- [ ] Errores sin detalles internos; logs sin datos personales ni secretos.
- [ ] Auditoría de dependencias antes de desplegar; no añadir librerías sin autorización.
- [ ] Nunca datos reales en desarrollo ni en pruebas.

### Datos personales o sensibles (si el proyecto los maneja)
- [ ] Consentimiento explícito guardado con fecha y versión.
- [ ] Exportar y eliminar o anonimizar los datos de una persona.
- [ ] Política de conservación y de copias de seguridad documentadas.

## Al terminar
Resume en 3 o 4 líneas qué puntos aplicaban a la tarea y cuáles quedan pendientes. No digas que algo está comprobado si no lo verificaste.
