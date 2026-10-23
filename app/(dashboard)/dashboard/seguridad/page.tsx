import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/private/auth'
import { factorVerificado } from '@/lib/private/auth/mfa'
import { SeguridadClient } from '@/components/private/SeguridadClient'

export const metadata: Metadata = {
  title: 'Seguridad | MGA Informática',
  robots: { index: false, follow: false },
}

export default async function SeguridadPage() {
  const session = await auth()
  if (!session) redirect('/auth/signin')
  const factor = await factorVerificado(session.user.id)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-texto">Seguridad</h1>
      <SeguridadClient
        email={session.user.email ?? ''}
        debeCambiarPassword={session.user.debeCambiarPassword}
        esAdmin={session.user.is_admin}
        tieneMfa={factor !== null}
        factorId={factor?.id ?? null}
      />
    </div>
  )
}
