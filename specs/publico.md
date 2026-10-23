# specs/publico.md — Especificación de la Zona Pública

> **Proyecto:** MGA Informática — Sitio público de marketing (`https://mgadigital.com.ar`)
> **Tipo de documento:** Especificación normativa para construir un proyecto nuevo.
> **Origen:** Revisión QA del sistema de referencia (mga-v2). Incorpora las correcciones de contradicciones y vacíos de seguridad detectados (ver Apéndice A).
> **Reglas comunes:** `AGENTS.md` manda ante conflicto (frontera público/privado §1, seguridad base §4, calidad y testing §5, env §9). Zona privada: `specs/privado.md`.

---

## 1. Propósito y alcance

Sitio institucional / marketing de una empresa de servicios IT (desarrollo web, sistemas de gestión "Zoologic", consultoría, soporte). Objetivos:

- Posicionar los servicios y sistemas propios con SEO sólido.
- Mostrar clientes y noticias como prueba social.
- Capturar consultas vía formulario de contacto (email).
- **Cero exposición de datos privados:** la landing solo consume la **superficie pública de datos** (`AGENTS.md` §1.3: noticias publicadas y clientes con `mostrar_en_landing`) con la anon key; nunca lee tablas del dashboard, roles ni secretos.

---

## 2. Stack y fuente de verdad de diseño

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.x App Router (Server Components por defecto) |
| Estilos | Tailwind CSS v4 (`@tailwindcss/postcss`) — **solo landing** |
| Animaciones | Framer Motion (solo landing) |
| Íconos | Lucide React |
| Datos | Supabase con **anon key** sobre la superficie pública (`AGENTS.md` §1.3). La zona pública **no usa service role** |
| Email | Resend vía `POST /api/public/contact` |
| Analytics | Google Analytics 4 (`@next/third-parties`, `NEXT_PUBLIC_GA_ID`) |
| SEO | `sitemap.ts`, `robots.ts`, Metadata API, JSON-LD |

**`lib/public/theme.ts` es la única fuente de verdad** de diseño y datos estáticos de la zona pública (deriva de `lib/shared/brand.ts`): colores, tipografías, radios, datos de contacto, items del navbar, palabras del banner animado, items de servicios y URL del sitio (`theme.site.url`). Los componentes jamás hardcodean colores/textos.

---

## 3. Mapa de sitio

| Ruta | Página | Propósito | Prioridad SEO |
|---|---|---|---|
| `/` | Home | Ventana principal (ver §4) | 1.0 |
| `/desarrollo-web` | Servicio | Desarrollo web a medida | 0.8 |
| `/sistemas-gestion` | Servicio | Sistemas de gestión (Zoologic) | 0.8 |
| `/consultoria-it` | Servicio | Consultoría IT | 0.8 |
| `/soporte-tecnico` | Servicio | Soporte y mantenimiento | 0.8 |
| `/lince` | Sistema Zoologic | Sistema Lince | 0.7 |
| `/dragonfish` | Sistema Zoologic | Sistema Dragonfish | 0.7 |
| `/pantera` | Sistema Zoologic | Sistema Pantera | 0.7 |
| `/noticias` | Listado | Noticias publicadas | 0.6 |
| `/noticias/[id]` | Detalle | Noticia con rich text + video | 0.5 |
| `/auth/signin` | Acceso (zona privada) | Fuera de esta spec: la landing solo lo enlaza de forma discreta. `noindex` | — |
| `404` | No encontrada | Volver al inicio + servicios | — |

**Requisito de rutas:** todas las páginas públicas viven en el route group `(public)`; las de acceso y dashboard quedan fuera (`AGENTS.md` §1). Ninguna ruta del dashboard se enlaza desde la landing salvo un acceso discreto al login (p. ej. en el footer). **Sin enlaces muertos:** todo link del navbar y del footer apunta a una ruta o ancla existente (el "Nosotros" del sistema anterior apuntaba a `#`; no se incluye salvo que se defina su página).

---

## 4. Home — secciones (en orden de render)

1. **`JsonLd`** — Schema.org `LocalBusiness` (nombre, URL, teléfono, dirección, geo, horarios) con datos de `theme`.
2. **`MovingBanner`** — banda animada fija superior con palabras de `theme.banner.words`.
3. **`Navbar`** — logo centrado, menú desktop con sub-items (Servicios con dropdown, Clientes con scroll a `#clientes`, Noticias, Contacto), hamburguesa en mobile. Logo clickeable → `/`.
4. **`Hero`** — slideshow de 3 imágenes con overlay y CTA.
5. **`Services`** — 4 servicios principales desde `theme.services.items` con ícono, título y descripción; links a sus páginas.
6. **`Process`** — timeline de 4 pasos del método de trabajo (hover interactivo).
7. **`SistemasZoologic`** — los 3 sistemas (Lince, Dragonfish, Pantera) con logos y links a sus páginas.
8. **`Clients`** — grilla de clientes con hover animado (Framer Motion); datos desde **DB** (§10).
9. **`Contact`** — formulario → `POST /api/public/contact` (§9).
10. **`Footer`** — banda CTA, 4 columnas (servicios, sistemas, contacto, legal), mapa embebido (Google Maps iframe) y datos de contacto de `theme`.

**Globales (layout de `(public)`, no el root):** `WhatsAppButton` (flotante, link `wa.me` con mensaje pre-cargado) y `GoogleAnalytics` (solo si `NEXT_PUBLIC_GA_ID` está definida). Ninguno se carga en las zonas privadas (`AGENTS.md` SEP-5).

---

## 5. Páginas de servicios (patrón común)

`/desarrollo-web`, `/sistemas-gestion`, `/consultoria-it`, `/soporte-tecnico`:

- Hero con título + bajada + CTA a contacto.
- Secciones: qué incluye, proceso, tecnologías, beneficios, FAQ (opcional).
- CTA final + footer compartido.
- **Metadata propia:** `title`, `description`, `keywords`, `canonical`, Open Graph y Twitter card con imagen dedicada.
- **Contenido (decisión D-03):** estático y tipado en `lib/public/content/*` (más `lib/public/theme.ts`); sin CMS ni edición desde el dashboard.

## 6. Páginas de sistemas Zoologic

`/lince`, `/dragonfish`, `/pantera`: ficha de producto (logo, descripción, módulos/características, capturas, CTA de demo/consulta). Mismo patrón de metadata/SEO que §5 con prioridad 0.7.

---

## 7. Noticias públicas

### `/noticias` (listado)
- Server Component: cliente Supabase **anon** sobre la superficie pública `noticias` (solo `publicada = true`, `AGENTS.md` §1.3), ordenadas por `fecha`/`created_at` desc.
- Renderiza `Noticias` (cards con `imagen_card`, título, resumen, fecha); si no hay noticias → estado vacío amigable.
- Metadata con keywords locales ("noticias tecnología Chubut", etc.).

### `/noticias/[id]` (detalle)
- `params` es `Promise` → `await`.
- Orden visual: **fecha + título ANTES de la imagen portada**; portada en contenedor 16:9 (`objectFit: contain`, fondo `#F0F2F4`).
- Contenido HTML (TipTap) renderizado con `dangerouslySetInnerHTML` **sanitizado con allowlist** (§12.3); retrocompatibilidad: si `contenido` no es HTML (`!/<[a-z]/i`), convertir `\n → <br />`.
- `video_url` (YouTube/Vimeo) incrustado si existe.
- Fecha: `noticia.fecha ?? created_at` formateada con split de `yyyy-mm-dd` (sin desfase UTC).
- Enlaces "Volver a noticias" / "Ver todas"; canonical + OG/Twitter + JSON-LD `Article`.
- 404 → `notFound()` si no existe o no está publicada.

---

## 8. Componentes globales de UI

| Componente | Comportamiento |
|---|---|
| `navbar` | Logo centrado, dropdowns desktop, menú hamburguesa mobile, resaltado de ruta activa, scroll suave a `#clientes` |
| `moving-banner` | Banda superior animada (loop) con palabras de theme |
| `footer` | CTA de contacto, 4 columnas de links, mapa embebido, datos de contacto, año dinámico |
| `whatsapp-button` | Flotante global; `wa.me` con mensaje pre-cargado |
| `json-ld` | LocalBusiness en la home |
| `noticias` | Reutilizable en home y `/noticias` |

**Accesibilidad:** contraste AA en textos sobre imagen (overlay siempre presente), `alt` descriptivos, foco visible, navegación por teclado en menús.

---

## 9. Formulario de contacto

### 9.1 Funcionalidad
- Campos: `name*`, `email*`, `phone` (opcional), `message*`.
- Envío `POST /api/public/contact` → construye email HTML (marca MGA) → Resend → `consultas@mgadigital.com.ar` con `replyTo` = email del usuario.
- Estados: idle → enviando (botón deshabilitado) → éxito (mensaje de agradecimiento) / error (reintentable).
- Validación en cliente (react-hook-form + Zod) con mensajes en español rioplatense.

### 9.2 Requisitos del endpoint (corregidos)
1. **Validación Zod server-side** (campos, longitudes máximas: nombre 100, email 254, teléfono 40, mensaje 3000).
2. **Escaping de todo input** antes de interpolarse en el HTML del email (evita inyección de HTML/markup en el mensaje saliente).
3. **Rate limiting** por IP (p. ej. 5 envíos / 10 min) con respuesta 429. El contador vive en un almacén compartido, no en memoria del proceso (`AGENTS.md` P-02). Honeypot obligatorio; captcha opcional en el cliente.
4. Sin sesión ni CORS abierta; solo `POST`; body size limitado.
5. Errores genéricos al usuario (no exponer detalles de Resend); log server-side.

---

## 10. Datos de clientes en la landing

- **Fuente de verdad:** la superficie pública `clientes` (`AGENTS.md` §1.3): solo `mostrar_en_landing = true`, `activo = true` y tipo distinto de `PARTICULAR`, leída con anon key y columnas whitelist `id, nombre, rubro, imagen, pagina_web`. Teléfono y dirección solo si se confirma `AGENTS.md` P-04.
- Render: grilla de logos con hover que revela el rubro (y dirección/teléfono solo si se confirma P-04), con animación Framer Motion.
- **Sin lista estática:** no existe `lib/clientes.ts` ni otra fuente paralela; la BD es la única fuente. Si la BD no responde, la sección Clientes se oculta (§12.8).
- **Privacidad:** solo clientes con permiso explícito (`mostrar_en_landing`); ningún otro dato de la tabla se expone (ni notas, ni CUIT, ni email interno). Un test automático lo verifica (§13.9).

---

## 11. SEO, metadatos y analítica

1. **`sitemap.ts`:** home + 4 servicios + 3 sistemas + `/noticias` + cada noticia publicada (dinámica desde DB con `lastModified`).
2. **`robots.ts`:** permitir `/`, servicios, sistemas, noticias; **bloquear** `/dashboard`, `/superadmin`, `/auth`, `/api`.
3. **Metadata por página:** `title`, `description`, `keywords`, `canonical`, Open Graph (`title`, `description`, `image`, `url`) y Twitter card. **Imagen OG dedicada** (no reutilizar la del hero).
4. **JSON-LD:** `LocalBusiness` en home; `Article` en detalle de noticias; `WebSite` opcional.
5. **Google Analytics 4:** `NEXT_PUBLIC_GA_ID`; si no existe, no se carga nada. Recordar que `NEXT_PUBLIC_*` se embebe en build time (cambiarlo requiere redeploy).
6. **Post-deploy:** registrar y enviar el sitemap en Google Search Console.
7. **Idioma:** `lang="es-AR"` en el root layout.

---

## 12. Requisitos de seguridad y calidad (normativos)

1. **Sin secretos ni privilegios:** ninguna API key secreta ni service role key en esta zona; solo existe la anon key, acotada por RLS + GRANT por columna (`AGENTS.md` SEP-4 y §1.3).
2. **Superficie mínima:** la única API de esta zona es `/api/public/contact`, con Zod, escape y rate limit (§9.2). Cualquier otra ruta de API pertenece a otra zona (`AGENTS.md` SEP-6).
3. **Sanitización de HTML:** cualquier HTML renderizado (noticias) pasa por allowlist (`p, br, strong, em, mark, ul, ol, li, h2-h4, a[href|target|rel], blockquote`); prohibido `<script>`, handlers e `iframes` no permitidos. El iframe de video se construye a partir del ID extraído de `video_url` contra una allowlist de hosts (YouTube/Vimeo); nunca proviene del HTML del contenido. Librería de saneamiento: `AGENTS.md` P-01.
4. **Formulario de contacto:** ver §9.2 (Zod + escape + rate limit).
5. **Iframes:** mapa embebido con `loading="lazy"` y atributos de `title`; sin iframes de terceros no listados.
6. **Headers:** `X-Frame-Options`/`frame-ancestors` para evitar clickjacking; `Referrer-Policy` razonable. CSP propia de la zona: permite solo GA4, Google Maps (iframe), YouTube/Vimeo y recursos propios (`AGENTS.md` SEP-8).
7. **Performance:** imágenes optimizadas (`next/image`, formatos modernos, dimensiones explícitas), fuentes auto-optimizadas, sin JS innecesario en servidor; animaciones que respetan `prefers-reduced-motion`.
8. **Disponibilidad:** si Supabase falla, la home degrada con datos de `theme` (nunca pantalla en blanco).

---

## 13. Criterios de aceptación

1. `/` renderiza las 10 secciones de §4 con datos de `theme` y clientes desde DB.
2. Las 8 páginas de contenido + noticias responden con metadata/canonical/OG propios y aparecen en el sitemap.
3. `/robots.txt` bloquea dashboard, superadmin, auth y API.
4. El formulario de contacto: valida en cliente y servidor, escapa HTML, limita por IP y envía el email correctamente (prueba con payload malicioso `<img onerror>` → se escapa).
5. Ninguna página pública expone datos de clientes sin `mostrar_en_landing`, ni errores con stack trace, ni variables de entorno.
6. Noticias publicadas → visibles en `/noticias` y su detalle renderiza HTML sanitizado y video incrustado.
7. Lighthouse (mobile): performance ≥ 90, accesibilidad ≥ 90, SEO = 100.
8. GA4 carga solo con `NEXT_PUBLIC_GA_ID` presente.
9. Un test automático confirma que, con la anon key, solo se leen noticias publicadas y clientes de landing con las columnas whitelist; el resto de las tablas es inaccesible.
10. Lighthouse CI (mobile) y axe corren en el pipeline con los umbrales de §13.7 y sin violaciones críticas.
11. Ninguna pantalla pública carga código de NextAuth ni del dashboard (`AGENTS.md` SEP-2 y SEP-5), verificado por lint y build.

---

## 14. Fuera de alcance (definido explícitamente)

- Cualquier ruta o dato del dashboard/superadmin más allá del login.
- Blog con CMS propio (se resuelve con el módulo de noticias del dashboard).
- Multidioma, e-commerce, chat en vivo, agendamiento de turnos (posibles futuros).
- Envíos masivos de email/WhatsApp desde la landing.

---

## Apéndice A — Correcciones aplicadas respecto del sistema de referencia

| # | Hallazgo QA (sistema de referencia) | Corrección en esta spec |
|---|---|---|
| 1 | Docs describían las páginas de servicios dentro de `app/(public)/`; en el código real están en la raíz de `app/` y `(public)` solo tiene un README | §3 — estructura unificada en `(public)` con la landing |
| 2 | Navbar: enlace "Nosotros" apunta a `#` sin destino | §3 — requisito: definir página o eliminar el enlace (no shippear links muertos) |
| 3 | OG image compartida con `hero-1.jpg` | §11.3 — imagen OG dedicada por página |
| 4 | `lib/clientes.ts` (array estático) coexistía con la selección DB `mostrar_en_landing` sin precedencia clara | §10 — DB como única fuente de verdad |
| 5 | `/api/contact` sin validación Zod, sin rate limit y con interpolación directa de input en el HTML del email | §9.2 — Zod + escape + rate limit + honeypot |
| 6 | Pendiente "enviar sitemap a Search Console" sin que constara el `sitemap.ts` | §11.1 y §11.6 — sitemap/robots implementados y paso de registro post-deploy |
| 7 | Componentes de landing listados incompletamente en docs (faltaban `noticias.tsx`, `whatsapp-button.tsx`) | §4 y §8 — inventario completo |
| 8 | Sin criterios de accesibilidad/performance definidos para la landing | §12.7 y §13.7 — Lighthouse con umbrales |
