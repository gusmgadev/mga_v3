# especificacion.md — Especificación funcional del sistema

> **Proyecto:** MGA Informática — sitio público + sistema interno de gestión.
> **Tipo de documento:** funcional. Describe **para qué sirve** cada parte del sistema y **qué operaciones** tiene. No describe tecnología (eso vive en `specs/publico.md` y `specs/privado.md`). Las reglas comunes, la frontera entre zonas y el proceso están en `AGENTS.md`; ante conflicto, `AGENTS.md` manda.
> **Mantenimiento:** un cambio que altere operaciones, estados o la estructura de módulos debe reflejarse aquí (además de en la spec técnica correspondiente).

---

## 1. Objetivo de la aplicación

MGA Informática es una empresa de servicios IT: desarrollo web, sistemas de gestión Zoologic, consultoría y soporte. La aplicación tiene dos caras:

- **Sitio público:** presenta la empresa, sus servicios y sistemas; muestra clientes y noticias como prueba social; y capta consultas de potenciales clientes mediante un formulario de contacto.
- **Sistema interno (dashboard):** cubre el ciclo completo del negocio — prospección comercial (búsqueda en internet y leads por email), gestión de clientes, activos, servicios y presupuestos, inventario con remitos, y control de fondos (gastos y cobranzas) — más un panel superadmin para administrar las empresas clientes del sistema de punto de venta.

---

## 2. Sitio público

### Home
Ventana principal del sitio. Secciones, en orden: banda animada superior, navegación (servicios con desplegable, noticias, contacto, clientes), portada con llamada a la acción, los 4 servicios principales, método de trabajo en 4 pasos, los 3 sistemas Zoologic, grilla de clientes, formulario de contacto y pie con datos de contacto, mapa y accesos legales. Botón flotante de WhatsApp en todas las páginas.

### Servicios (4 páginas)
`Desarrollo web`, `Sistemas de gestión`, `Consultoría IT`, `Soporte técnico`. Cada página presenta: qué incluye el servicio, el proceso de trabajo, tecnologías, beneficios y preguntas frecuentes; con llamada final a contacto. El contenido es estático (no se edita desde el dashboard).

### Sistemas Zoologic (3 páginas)
Fichas de producto de `Lince`, `Dragonfish` y `Pantera`: descripción, módulos y características, capturas y llamada a consulta/demo.

### Noticias (públicas)
- **Listado:** tarjetas con imagen, título, resumen y fecha; solo noticias publicadas, de más reciente a más antigua.
- **Detalle:** fecha y título, imagen de portada, contenido con formato (negrita, cursiva, resaltado, listas), video incrustado (YouTube/Vimeo) si tiene; enlaces de vuelta al listado. Una noticia no publicada o inexistente se muestra como "no encontrada".

### Contacto
Formulario con nombre, email, teléfono (opcional) y mensaje. Al enviarlo, la consulta llega por email a la empresa, respondiendo directamente al email del que escribió. Estados del formulario: idle → enviando → éxito (agradecimiento) / error (reintentable). Protegido contra envíos automatizados y con límite de envíos por IP.

### Clientes en la landing
Grilla de logos de clientes con hover que revela el rubro. Solo aparecen clientes **activos**, **no particulares** y que el personal marcó con "mostrar en la landing" desde el dashboard. Si la base de datos no responde, la sección se oculta sin romper la página.

---

## 3. Dashboard — módulos

El sistema interno es la zona de trabajo del personal, con acceso por usuario y contraseña. Cada usuario ve y puede operar los módulos según su rol. La pantalla de inicio tiene acceso rápido a los módulos y submódulos permitidos.

### 3.1 Zoologic

#### Oportunidades
Pipeline comercial de los leads que llegan por email (consultas, seguimientos y venta cruzada).

- **Operaciones:** buscar y seleccionar correos de la casilla; extraer oportunidades de los correos seleccionados (asistido por inteligencia artificial); ver la lista (filtro de activas); ver el detalle; cambiar el estado; registrar iteraciones de contacto (teléfono, WhatsApp, correo, presencial, otro); botón de WhatsApp con mensaje pre-cargado; generar un presupuesto desde la oportunidad; eliminar.
- **Estados:** NUEVA → PRIMER_CONTACTO_WS → EN_PROCESO → PRESUPUESTADA; finales: GANADA, NO_GANADA, NO_OP.
- **Reglas:** los correos ya procesados no se duplican; el primer contacto por WhatsApp avanza el estado automáticamente; aprobar o rechazar el presupuesto vinculado cierra la oportunidad como GANADA o NO_GANADA.
- **Vínculos:** puede quedar ligada a un cliente, un presupuesto y un servicio.

### 3.2 Prospectos

#### Radar
Búsqueda de prospectos en internet (empresas de cualquier rubro que puedan necesitar los servicios de MGA).

- **Operaciones:** crear una búsqueda (ubicación, rubro o palabras clave, filtros: con/sin sitio web, con teléfono o email, cantidad mínima de reseñas, estado); ver las búsquedas con su progreso; ver los resultados en grilla con los puntajes y filtros rápidos; ver el detalle del prospecto (datos de contacto, ubicación, análisis de su sitio web, puntuaciones con sus motivos, historial de interacciones y fuentes); configurar los servicios objetivo que se ofrecen (rubros y palabras clave); **marcar un resultado como "Prospecto"** para pasarlo a la lista de trabajo; convertir un prospecto en cliente (y opcionalmente generarle un servicio o presupuesto); marcar "no contactar" con motivo.
- **Puntuación:** cada prospecto recibe 4 puntajes (actividad comercial, necesidad digital, contactabilidad, compatibilidad con los servicios ofrecidos) y un puntaje final con nivel y motivos explicados. Nunca se muestra un número sin explicación.
- **Reglas:** los mismos lugares no se repiten entre búsquedas ni dentro de una búsqueda; hay un límite de búsquedas por período; cada usuario ve solo sus propios prospectos y búsquedas.

#### Prospectos
Lista de trabajo de los prospectos marcados desde el Radar.

- **Operaciones:** ver la lista y el detalle; actualizar el estado comercial; registrar el contacto y el historial de iteraciones con fecha y próximo seguimiento; enviar WhatsApp; excluir con "no contactar"; convertir a cliente (crea la ficha del cliente y, si corresponde, un servicio en curso o un presupuesto en borrador).
- **Estados comerciales:** nuevo, revisado, a contactar, contactado, interesado, reunión, propuesta enviada, ganado, perdido, descartado, no contactar, cliente existente.

### 3.3 Servicios

#### Servicios
Órdenes de trabajo de los servicios realizados a clientes.

- **Operaciones:** lista, detalle, crear, editar, eliminar; gestionar tareas del servicio; registrar o imputar pagos; generar un servicio desde un presupuesto aprobado.
- **Estados del servicio:** INGRESADO, EN PROCESO, TERMINADO, CANCELADO, RECHAZADO, PRESUPUESTADO.
- **Estados de pago:** PENDIENTE, SIN CARGO, GARANTIA, PAGO PARCIAL, PAGADO.
- **Reglas:** al terminar todas las tareas, el servicio se termina solo; si a un servicio terminado se le agrega una tarea, vuelve a EN PROCESO. Los pagos se registran en Cobranzas ligados al servicio; el saldo es valor menos lo pagado.

#### Presupuestos
Presupuestos con ítems detallados.

- **Operaciones:** lista con filtros (cliente, estado), detalle con ítems, crear, editar, eliminar; adjuntar el documento (PDF/Word); enviar, aprobar o rechazar.
- **Estados:** BORRADOR, ENVIADO, APROBADO, RECHAZADO, VENCIDO.
- **Reglas:** el total se calcula siempre de la suma de los ítems (cantidad × precio unitario); aprobar o rechazar un presupuesto vinculado a una oportunidad cierra esa oportunidad como GANADA o NO_GANADA; desde un presupuesto aprobado se puede generar el servicio.

### 3.4 Altas

#### Clientes
Ficha maestra de clientes.

- **Operaciones:** lista, crear, editar, eliminar; subir el logo; marcar "mostrar en la landing"; alta rápida desde Activos, Servicios, Presupuestos y Oportunidades.
- **Datos:** nombre, tipo (particular / empresa / comercio), email, teléfono, dirección, localidad, CUIT, rubro, notas, página web, activo.

#### Activos
Equipos y elementos de cada cliente (PC, notebook, servidor, impresora, sistemas, desarrollos, servicios, otros).

- **Operaciones:** lista filtrable por cliente; crear, editar, eliminar; alta rápida (requiere cliente seleccionado).
- **Datos:** nombre, tipo, marca, modelo, número de serie, cliente, activo.

### 3.5 Inventario

#### Productos
Catálogo de productos del depósito.

- **Operaciones:** lista, crear, editar, eliminar; alta de marcas y rubros desde el propio formulario.
- **Datos:** código, nombre, marca, rubro y subrubro, unidad, stock actual, costo, precio de venta, activo.
- **Regla:** el stock actual solo cambia al confirmar remitos; nunca se edita a mano.

#### Remitos
Ingreso y egreso de stock.

- **Operaciones:** lista, detalle, crear, editar, confirmar (aplica los movimientos y ajusta el stock), anular; agregar ítems (producto del catálogo o nombre detectado); ingreso por voz (dictar los ítems: el sistema transcribe y propone productos con un grado de confianza; lo dudoso se resuelve a mano: usar coincidencia, crear producto o descartar); gestionar el catálogo de orígenes y destinos (sucursal, depósito, cliente, otro).
- **Estados:** borrador, confirmado, anulado.
- **Reglas:** un remito confirmado genera el movimiento de stock correspondiente (entrada, salida o ajuste); un remito anulado revierte su efecto. Cada remito guarda quién lo confirmó y cuándo.

#### Proveedores
Ficha y gestión de los proveedores.

- **Operaciones:** lista, crear, editar, eliminar.
- **Reglas:** los remitos de entrada pueden referenciar un proveedor (antes este rol lo cumplía el catálogo de orígenes y destinos; esa lista queda para sucursales, depósitos, clientes u otros). El detalle de campos se fija al construir el módulo (ver `AGENTS.md` P-16).

### 3.6 Fondos

#### Gastos
Control mensual de los gastos del negocio.

- **Operaciones:** navegar de mes en mes; inicializar el mes desde la plantilla de gastos; agregar gastos puntuales; pagar total o parcialmente (monto, fecha, método de pago, tarjeta); editar y eliminar; ver resumen y totales (estimado, pagado, pendiente, cantidad sin pagar).
- **Plantilla:** lista fija de gastos recurrentes (categoría, descripción, monto estimado, orden); se puede editar.
- **Estados del gasto:** PENDIENTE, PAGO PARCIAL, PAGADO; se recalculan solos según lo pagado.

#### Cobranzas
Movimientos de dinero de los clientes.

- **Operaciones:** lista con filtros (cliente, tipo, rango de fechas) y resumen de cargos, pagado y saldo; crear, editar, eliminar; imputar un pago a cuenta (parcial o total) a un servicio.
- **Tipos:** CARGO (lo que debe el cliente), PAGO (lo que paga), NOTA DE CRÉDITO.
- **Reglas:** un pago puede quedar a cuenta (sin servicio) o ligado a un servicio; cada movimiento recalcula el estado de pago del servicio afectado.

### 3.7 Administración

#### Usuarios
Alta, edición y baja de usuarios del sistema. El alta solo la hace un Administrador; solo un Administrador cambia el rol de otro usuario (nadie cambia el suyo propio).

#### Roles
Creación y eliminación de los roles (grupos de permisos) de la empresa.

#### Permisos
Definición de qué puede ver, crear, editar y eliminar cada rol, sobre los módulos, submódulos y acciones concretas del sistema (por ejemplo: ver Servicios pero no editarlos, o solo poder publicar noticias). Conceder un grupo concede todo lo que contiene; para excluir algo, se concede lo que sí y se deja lo demás fuera.

### 3.8 LandingPage

Gestión del contenido del sitio público que se edita desde el dashboard.

#### Noticias
Publicación de las noticias que aparecen en el sitio público.

- **Operaciones:** lista, crear, editar, eliminar; escribir con formato (negrita, cursiva, resaltado, listas); subir imagen de tarjeta e imagen de portada; asociar video (YouTube/Vimeo); elegir fecha, orden y si está publicada.
- **Reglas:** una noticia solo se muestra en el sitio público cuando está publicada; al pasarla a publicada, si corresponde, se comparte automáticamente en Instagram (si no hay configuración, se omite sin romper nada).

---

## 4. Superadmin

Panel de uso exclusivo del dueño para administrar las empresas que usan el sistema de punto de venta (POS).

- **Login:** acceso con una contraseña propia del panel (independiente del dashboard).
- **Empresas:** lista con plan (básico / profesional / enterprise), estado de implementación, módulos activos y vencimiento; alta (con todos los módulos preseleccionados) y edición de datos y de los módulos activos de cada empresa.
- **Módulos POS:** catálogo de los módulos disponibles del sistema (ventas, inventario, caja, contactos, finanzas, administración, óptica, etc.). Es la única fuente de verdad: las empresas activan o desactivan módulos de ese catálogo.

---

## 5. Flujo comercial completo (visión de conjunto)

1. El **Radar** encuentra prospectos en internet → se marcan como "Prospecto" y se trabajan en **Prospectos** (contacto e iteraciones).
2. En paralelo, los leads que llegan por email se convierten en **Oportunidades** (Zoologic).
3. De una oportunidad o de un prospecto se genera un **Presupuesto**; al aprobarlo se cierra la oportunidad como GANADA y puede generarse el **Servicio**.
4. El **Servicio** se ejecuta con sus tareas y se cobra desde **Cobranzas**.
5. El **Cliente** resultante puede quedar visible en la landing del sitio público si así se decide.
