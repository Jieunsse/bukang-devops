'use client'

import { Toast } from '@heroui/react'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

const TEN_MINUTES = 10 * 60 * 1000
const ONE_DAY = 24 * 60 * 60 * 1000

function browserStorage() {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    // 사생활 보호 모드처럼 저장소를 막은 브라우저는 저장 없이 동작한다.
    return undefined
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: TEN_MINUTES, gcTime: ONE_DAY, refetchOnWindowFocus: false },
        },
      }),
  )
  const [persister] = useState(() =>
    createSyncStoragePersister({ storage: browserStorage(), key: 'bukang-devops' }),
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider
        client={queryClient}
        // 저장 모양이 바뀌면 buster를 올려 지난 저장분을 버린다.
        persistOptions={{ persister, maxAge: ONE_DAY, buster: 'snapshot-v7' }}
      >
        {children}
        <Toast.Provider />
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
