import { randomBytes } from 'node:crypto'

/** Clave temporal aleatoria (≥12 chars) para alta de usuarios (§5.5). */
export function generarClaveTemporal(): string {
  return randomBytes(12).toString('base64url')
}
