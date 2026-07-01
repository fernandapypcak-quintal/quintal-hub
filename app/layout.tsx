import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quintal HUB',
  description: 'Central de dashboards do Quintal',
  icons: {
    icon: '/quintal-tree.jpg',
    apple: '/quintal-tree.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </head>
      <body style={{ margin: 0, fontFamily: "'DM Sans', system-ui, sans-serif", background: '#FAFAF8' }}>
        {children}
      </body>
    </html>
  )
}
