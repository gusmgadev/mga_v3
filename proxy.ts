import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/private/auth'

// Protección de rutas de zonas privadas (AGENTS.md §1.2 SEP-6 y specs/privado.md §5).
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const session = await auth()

  if (pathname.startsWith('/auth/')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard/')) {
    if (!session) {
      const url = new URL('/auth/signin', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
    if (
      session.user.debeCambiarPassword &&
      !pathname.startsWith('/dashboard/seguridad')
    ) {
      return NextResponse.redirect(new URL('/dashboard/seguridad', req.url))
    }
    // Sin gate por is_admin: cada vista admin exige su permiso de nodo en servidor
    // (requiereVista → D-05/D-16; el rol Superadmin no es is_admin y accede a
    // administracion.empresas / administracion.modulos_pos por sus permisos).
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
