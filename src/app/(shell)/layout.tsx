import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { connection } from 'next/server'

import { AppShell } from '@/widgets/app-shell'
import type { Snapshot } from '@/shared/api/linear'
import { SNAPSHOT_QUERY_KEY } from '@/shared/api/linear/query'
import { getSnapshot, MissingApiKeyError } from '@/shared/api/linear/server'
import { ErrorScreen } from '@/shared/ui'

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  // 빌드할 때 Linear를 부르지 않고, 요청이 올 때마다 서버 캐시에서 읽는다.
  await connection()

  let snapshot: Snapshot
  try {
    snapshot = await getSnapshot()
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return (
        <ErrorScreen
          title="Linear 키가 설정되지 않았어요"
          description="Vercel 운영 환경변수에 LINEAR_API_KEY를 넣고 다시 배포해 주세요."
        />
      )
    }
    throw error
  }

  // 받은 시각을 넣어 두면, 브라우저에 더 새로운 저장분이 있을 때 그쪽을 남긴다.
  const queryClient = new QueryClient()
  queryClient.setQueryData(SNAPSHOT_QUERY_KEY, snapshot, {
    updatedAt: Date.parse(snapshot.fetchedAt),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppShell>{children}</AppShell>
    </HydrationBoundary>
  )
}
