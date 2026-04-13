import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Header } from '@/components/header'

export const metadata: Metadata = {
  title: 'FitTogether — Найди партнёра для тренировок',
  description: 'Trust Score • Совместные тренировки • Реальная мотивация',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <Header />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}