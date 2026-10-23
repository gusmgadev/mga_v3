-- 000002 — Radar en español (P-05). Renombra tablas y columnas del Radar
-- de inglés a español según specs/privado.md §4.5. Conserva datos, FKs,
-- índices y RLS (PostgreSQL actualiza referencias automáticamente al renombrar).
-- Las políticas RLS se re-crean porque el texto USING/WITH CHECK referencia
-- nombres de columna que cambian.

-- ============================================================
-- 1. Renombrar tablas
-- ============================================================
alter table public.prospect_searches     rename to busquedas_radar;
alter table public.prospect_search_results rename to resultados_busqueda;
alter table public.prospects             rename to prospectos;
alter table public.prospect_interactions rename to interacciones_prospecto;
alter table public.prospect_services     rename to servicios_prospecto;
alter table public.prospect_jobs         rename to trabajos_radar;
alter table public.website_analyses      rename to analisis_web;

-- ============================================================
-- 2. busquedas_radar: renombrar columnas
-- ============================================================
alter table public.busquedas_radar rename column user_id to usuario_id;
alter table public.busquedas_radar rename column service_id to servicio_id;
alter table public.busquedas_radar rename column province to provincia;
alter table public.busquedas_radar rename column city to ciudad;
alter table public.busquedas_radar rename column category to categoria;
alter table public.busquedas_radar rename column keywords to palabras_clave;
alter table public.busquedas_radar rename column radius_km to radio_km;
alter table public.busquedas_radar rename column max_results to max_resultados;
alter table public.busquedas_radar rename column website_filter to con_sitio_web;
alter table public.busquedas_radar rename column phone_required to requiere_telefono;
alter table public.busquedas_radar rename column email_required to requiere_email;
alter table public.busquedas_radar rename column min_rating to rating_minimo;
alter table public.busquedas_radar rename column min_review_count to min_reseñas;
alter table public.busquedas_radar rename column business_status_filter to estado_negocio;
alter table public.busquedas_radar rename column status to estado;
alter table public.busquedas_radar rename column total_found to total_encontrados;
alter table public.busquedas_radar rename column total_saved to total_guardados;
alter table public.busquedas_radar rename column total_analyzed to total_analizados;
alter table public.busquedas_radar rename column progress to progreso;
alter table public.busquedas_radar rename column error_message to mensaje_error;
alter table public.busquedas_radar rename column started_at to iniciado_at;
alter table public.busquedas_radar rename column completed_at to completado_at;

-- ============================================================
-- 3. prospectos: renombrar columnas
-- ============================================================
alter table public.prospectos rename column user_id to usuario_id;
alter table public.prospectos rename column name to nombre;
alter table public.prospectos rename column normalized_name to nombre_normalizado;
alter table public.prospectos rename column category to categoria;
alter table public.prospectos rename column categories to categorias;
alter table public.prospectos rename column description to descripcion;
alter table public.prospectos rename column country to pais;
alter table public.prospectos rename column province to provincia;
alter table public.prospectos rename column city to ciudad;
alter table public.prospectos rename column address to direccion;
alter table public.prospectos rename column postal_code to codigo_postal;
alter table public.prospectos rename column latitude to latitud;
alter table public.prospectos rename column longitude to longitud;
alter table public.prospectos rename column phone to telefono;
alter table public.prospectos rename column normalized_phone to telefono_normalizado;
alter table public.prospectos rename column website to sitio_web;
alter table public.prospectos rename column website_domain to dominio_sitio;
alter table public.prospectos rename column google_maps_url to url_google_maps;
alter table public.prospectos rename column review_count to cantidad_resenas;
alter table public.prospectos rename column business_status to estado_negocio;
alter table public.prospectos rename column opening_hours to horarios;
alter table public.prospectos rename column commercial_activity_score to puntaje_actividad_comercial;
alter table public.prospectos rename column digital_need_score to puntaje_necesidad_digital;
alter table public.prospectos rename column contactability_score to puntaje_contactabilidad;
alter table public.prospectos rename column service_fit_score to puntaje_compatibilidad;
alter table public.prospectos rename column opportunity_score to puntaje_oportunidad;
alter table public.prospectos rename column opportunity_level to nivel_oportunidad;
alter table public.prospectos rename column recommended_service_id to servicio_recomendado_id;
alter table public.prospectos rename column recommended_service_name to servicio_recomendado_nombre;
alter table public.prospectos rename column opportunity_summary to resumen_oportunidad;
alter table public.prospectos rename column opportunity_reasons to motivos_oportunidad;
alter table public.prospectos rename column analysis_status to estado_analisis;
alter table public.prospectos rename column commercial_status to estado_comercial;
alter table public.prospectos rename column do_not_contact to no_contactar;
alter table public.prospectos rename column exclusion_reason to motivo_exclusion;
alter table public.prospectos rename column excluded_at to excluido_at;
alter table public.prospectos rename column source to fuente;
alter table public.prospectos rename column source_url to fuente_url;
alter table public.prospectos rename column source_data to fuente_datos;
alter table public.prospectos rename column last_verified_at to ultima_verificacion_at;
alter table public.prospectos rename column analyzed_at to analizado_at;

-- ============================================================
-- 4. resultados_busqueda: renombrar columnas
-- ============================================================
alter table public.resultados_busqueda rename column search_id to busqueda_id;
alter table public.resultados_busqueda rename column prospect_id to prospecto_id;
alter table public.resultados_busqueda rename column position to posicion;
alter table public.resultados_busqueda rename column matched_query to consulta_coincidida;

-- ============================================================
-- 5. interacciones_prospecto: renombrar columnas
-- ============================================================
alter table public.interacciones_prospecto rename column prospect_id to prospecto_id;
alter table public.interacciones_prospecto rename column user_id to usuario_id;
alter table public.interacciones_prospecto rename column interaction_type to tipo_interaccion;
alter table public.interacciones_prospecto rename column channel to canal;
alter table public.interacciones_prospecto rename column notes to notas;
alter table public.interacciones_prospecto rename column interaction_date to fecha_interaccion;
alter table public.interacciones_prospecto rename column next_follow_up_at to proximo_seguimiento_at;

-- ============================================================
-- 6. servicios_prospecto: renombrar columnas
-- ============================================================
alter table public.servicios_prospecto rename column user_id to usuario_id;
alter table public.servicios_prospecto rename column name to nombre;
alter table public.servicios_prospecto rename column description to descripcion;
alter table public.servicios_prospecto rename column target_categories to categorias_objetivo;
alter table public.servicios_prospecto rename column target_keywords to palabras_clave_objetivo;
alter table public.servicios_prospecto rename column problems_solved to problemas_resueltos;
alter table public.servicios_prospecto rename column is_active to activo;

-- ============================================================
-- 7. trabajos_radar: renombrar columnas
-- ============================================================
alter table public.trabajos_radar rename column user_id to usuario_id;
alter table public.trabajos_radar rename column search_id to busqueda_id;
alter table public.trabajos_radar rename column prospect_id to prospecto_id;
alter table public.trabajos_radar rename column job_type to tipo_trabajo;
alter table public.trabajos_radar rename column status to estado;
alter table public.trabajos_radar rename column attempts to intentos;
alter table public.trabajos_radar rename column max_attempts to max_intentos;
alter table public.trabajos_radar rename column payload to carga;
alter table public.trabajos_radar rename column result to resultado;
alter table public.trabajos_radar rename column error_message to mensaje_error;
alter table public.trabajos_radar rename column scheduled_at to programado_at;
alter table public.trabajos_radar rename column started_at to iniciado_at;
alter table public.trabajos_radar rename column completed_at to completado_at;

-- ============================================================
-- 8. analisis_web: renombrar columnas
-- ============================================================
alter table public.analisis_web rename column prospect_id to prospecto_id;
alter table public.analisis_web rename column final_url to url_final;
alter table public.analisis_web rename column reachable to alcanzable;
alter table public.analisis_web rename column has_ssl to tiene_ssl;
alter table public.analisis_web rename column is_mobile_friendly to es_movil_amigable;
alter table public.analisis_web rename column has_ecommerce to tiene_comercio;
alter table public.analisis_web rename column has_catalog to tiene_catalogo;
alter table public.analisis_web rename column has_booking_system to tiene_reservas;
alter table public.analisis_web rename column has_contact_form to tiene_formulario_contacto;
alter table public.analisis_web rename column has_whatsapp to tiene_whatsapp;
alter table public.analisis_web rename column has_customer_portal to tiene_portal_cliente;
alter table public.analisis_web rename column has_live_chat to tiene_chat_en_vivo;
alter table public.analisis_web rename column detected_emails to emails_detectados;
alter table public.analisis_web rename column detected_phones to telefonos_detectados;
alter table public.analisis_web rename column detected_social_links to redes_detectadas;
alter table public.analisis_web rename column detected_technologies to tecnologias_detectadas;
alter table public.analisis_web rename column detected_keywords to palabras_clave_detectadas;
alter table public.analisis_web rename column performance_score to puntuacion_performance;
alter table public.analisis_web rename column accessibility_score to puntuacion_accesibilidad;
alter table public.analisis_web rename column seo_score to puntuacion_seo;
alter table public.analisis_web rename column best_practices_score to puntuacion_mejores_practicas;
alter table public.analisis_web rename column crux_available to crux_disponible;
alter table public.analisis_web rename column crux_data to crux_datos;
alter table public.analisis_web rename column analysis_summary to resumen_analisis;
alter table public.analisis_web rename column raw_data to datos_crudos;

-- ============================================================
-- 9. Recrear políticas RLS (el texto USING referencia nombres viejos)
-- ============================================================
drop policy if exists "Users can manage own prospect_interactions" on public.interacciones_prospecto;
drop policy if exists "Users can manage own prospect_jobs" on public.trabajos_radar;
drop policy if exists "Users can manage own prospect_search_results" on public.resultados_busqueda;
drop policy if exists "Users can manage own prospect_searches" on public.busquedas_radar;
drop policy if exists "Users can manage own prospect_services" on public.servicios_prospecto;
drop policy if exists "Users can manage own prospects" on public.prospectos;
drop policy if exists "Users can manage own website_analyses" on public.analisis_web;

create policy "usuario gestiona sus interacciones"
  on public.interacciones_prospecto for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario gestiona sus trabajos"
  on public.trabajos_radar for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario gestiona sus resultados"
  on public.resultados_busqueda for all to authenticated
  using (exists (
    select 1 from public.busquedas_radar b
    where b.id = resultados_busqueda.busqueda_id
      and b.usuario_id = auth.uid()
  ));

create policy "usuario gestiona sus busquedas"
  on public.busquedas_radar for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario gestiona sus servicios prospecto"
  on public.servicios_prospecto for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario gestiona sus prospectos"
  on public.prospectos for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario gestiona sus analisis web"
  on public.analisis_web for all to authenticated
  using (exists (
    select 1 from public.prospectos p
    where p.id = analisis_web.prospecto_id
      and p.usuario_id = auth.uid()
  ));

-- ============================================================
-- 10. Tabla nueva: uso_api_radar (control de cuota)
-- ============================================================
create table public.uso_api_radar (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  busqueda_id bigint,
  api text not null,
  registros integer not null default 1,
  created_at timestamp with time zone not null default now()
);

alter table public.uso_api_radar enable row level security;

create policy "usuario gestiona su uso de api"
  on public.uso_api_radar for all to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create index if not exists uso_api_radar_usuario_idx on public.uso_api_radar (usuario_id, created_at);
