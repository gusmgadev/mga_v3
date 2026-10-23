import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/app/(dashboard)/globals.css'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-4">{children}</div>
}
