#!/usr/bin/env node
// Verifica (AGENTS.md §5 CI):
// 1) Toda process.env.X usada en el código está declarada en la tabla §9 de AGENTS.md.
// 2) Toda variable de §9 está cubierta en .env.example.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCAN_DIRS = ['app', 'lib', 'components', 'scripts', 'tests', 'supabase'];
const SCAN_FILES = ['proxy.ts', 'next.config.ts'];
const SKIP = new Set(['node_modules', '.next', 'dist', '.git']);

function seccionAgents() {
  const md = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  const inicio = md.indexOf('## 9. Variables de entorno');
  if (inicio === -1) throw new Error('No se encontró §9 en AGENTS.md');
  const fin = md.indexOf('## 10.', inicio);
  const bloque = md.slice(inicio, fin === -1 ? undefined : fin);
  const vars = new Set();
  for (const linea of bloque.split('\n')) {
    if (!linea.trimStart().startsWith('|')) continue;
    const celdas = linea.split('|');
    const primeraCelda = celdas[1] ?? '';
    for (const m of primeraCelda.matchAll(/`([A-Z][A-Z0-9_]+)`/g)) vars.add(m[1]);
  }
  return vars;
}

function envExampleKeys() {
  const txt = readFileSync(join(ROOT, '.env.example'), 'utf8');
  const keys = new Set();
  for (const linea of txt.split('\n')) {
    const m = linea.match(/^([A-Z0-9_]+)=/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function archivos(dir, out = []) {
  for (const nombre of readdirSync(dir)) {
    if (SKIP.has(nombre)) continue;
    const ruta = join(dir, nombre);
    const st = statSync(ruta);
    if (st.isDirectory()) archivos(ruta, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(nombre)) out.push(ruta);
  }
  return out;
}

const usadas = new Map();
const files = [...SCAN_FILES, ...SCAN_DIRS.flatMap((d) => {
  try {
    return archivos(join(ROOT, d));
  } catch {
    return [];
  }
})];
for (const f of files) {
  if (f.replaceAll('\\', '/').endsWith('scripts/check-env.mjs')) continue;
  const txt = readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (!usadas.has(m[1])) usadas.set(m[1], f);
  }
}

const permitidas = seccionAgents();
const ejemplo = envExampleKeys();
const errores = [];

for (const [v, f] of usadas) {
  if (v === 'NODE_ENV') continue;
  if (!permitidas.has(v)) errores.push(`process.env.${v} usada en ${f} no está declarada en AGENTS.md §9`);
}
for (const v of permitidas) {
  if (!ejemplo.has(v)) errores.push(`AGENTS.md §9 declara ${v} pero falta en .env.example`);
}
for (const v of ejemplo) {
  if (!permitidas.has(v)) errores.push(`.env.example tiene ${v} que no está en AGENTS.md §9`);
}

if (errores.length > 0) {
  console.error('check-env FALLÓ:');
  for (const e of errores) console.error(' -', e);
  process.exit(1);
}
console.log(`check-env OK: ${usadas.size} usadas, ${permitidas.size} en §9, ${ejemplo.size} en .env.example`);
