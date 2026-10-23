import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      role_id: string
      is_admin: boolean
      debeCambiarPassword: boolean
    } & DefaultSession['user']
  }

  interface User {
    role: string
    role_id: string
    is_admin: boolean
    debeCambiarPassword: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    role_id?: string
    is_admin?: boolean
    debeCambiarPassword?: boolean
  }
}
