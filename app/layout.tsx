import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quintal HUB',
  description: 'Central de dashboards do Quintal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
