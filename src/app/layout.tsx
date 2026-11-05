import type { Metadata } from 'next'

import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'bukang-devops',
  description: '크루런 팀 티켓 일정과 기한',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
