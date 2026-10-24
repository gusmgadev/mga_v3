import 'server-only'
import { createHash } from 'node:crypto'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { COOKIE_ACCESO_MFA } from './auth/cookies'
import { obtenerPerfil } from './auth/perfil'
import { verifyMfa } from './auth/mfa'
import { verificarStepToken } from './auth/step-token'
import { supabaseAdmin } from './supabase-admin'
import { rateLimitMfaPorIp, rateLimitMfaPorUsuario } from './rate-limit'

const Credenciales = z.object({
  step_token: z.string().min(1),
  mfa_code: z.string().optional(),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/auth/signin' },
  providers: [
    Credentials({
      credentials: {
        step_token: { type: 'text' },
        mfa_code: { type: 'text' },
      },
      authorize: async (credenciales) => {
        const secreto = process.env.AUTH_SECRET
        if (!secreto) throw new Error('Falta AUTH_SECRET en el entorno')
        const parseo = Credenciales.safeParse(credenciales)
        if (!parseo.success) return null
        const payload = verificarStepToken(parseo.data.step_token, secreto)
        if (!payload) return null

        if (payload.has_mfa) {
          const codigo = (parseo.data.mfa_code ?? '').trim()
          if (!codigo || !payload.factorId || !payload.challengeId) return null
          const jarra = await cookies()
          const accessToken = jarra.get(COOKIE_ACCESO_MFA)?.value
          if (!accessToken) return null
          try {
            const limiteUsuario = await rateLimitMfaPorUsuario(payload.sub)
            if (!limiteUsuario.ok) return null
          } catch {
            return null
          }
          const ok = await verifyMfa(accessToken, payload.factorId, payload.challengeId, codigo)
          if (!ok) return null
        }

        const perfil = await obtenerPerfil(payload.sub)
        if (!perfil || !perfil.activo) return null

        const tokenHash = createHash('sha256').update(parseo.data.step_token).digest('hex')
        const { error: tokenUsado } = await supabaseAdmin()
          .from('step_tokens_usados')
          .insert({ token_hash: tokenHash })
        if (tokenUsado) return null

        return {
          id: perfil.id,
          email: perfil.email,
          name: perfil.name,
          role: perfil.role,
          role_id: perfil.role_id,
          is_admin: perfil.is_admin,
          auth_version: perfil.auth_version,
          debeCambiarPassword: perfil.password_changed_at === null,
        }
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.role = user.role
        token.role_id = user.role_id
        token.is_admin = user.is_admin
        token.auth_version = user.auth_version
        token.debeCambiarPassword = user.debeCambiarPassword
      }
      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.email = token.email ?? session.user.email
        session.user.name = token.name ?? session.user.name
        session.user.role = typeof token.role === 'string' ? token.role : ''
        session.user.role_id = typeof token.role_id === 'string' ? token.role_id : ''
        session.user.is_admin = token.is_admin === true
        session.user.auth_version = typeof token.auth_version === 'number' ? token.auth_version : 0
        session.user.debeCambiarPassword = token.debeCambiarPassword === true
      }
      return session
    },
  },
})
