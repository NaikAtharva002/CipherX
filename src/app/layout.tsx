import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'CIPHERX — Tech Treasure Hunt',
  description: 'UX Club Annual Cybersecurity Treasure Hunt Platform',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid-bg scanlines">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#e2e8f0',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
            },
            success: {
              iconTheme: { primary: '#00ff41', secondary: '#111827' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#111827' },
            },
          }}
        />
      </body>
    </html>
  )
}
