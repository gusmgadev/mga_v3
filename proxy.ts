import { NextResponse } from 'next/server';

// Protección de rutas de zonas privadas (AGENTS.md §1.2 SEP-6 y specs/privado.md §5).
// Fase 0: esqueleto con matcher. La lógica de sesión, roles y cookie de superadmin se
// implementa en la Fase 1 junto con NextAuth y el proxy de validación.
export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/superadmin/:path*', '/auth/:path*'],
};
