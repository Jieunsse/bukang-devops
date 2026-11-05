import type { PersistedClient } from '@tanstack/react-query-persist-client'

import { SNAPSHOT_QUERY_KEY } from './query'
import { snapshotSchema } from './schema'

/**
 * 브라우저에 남긴 값을 꺼낼 때 스냅샷 형식을 검사한다. 형식이 다르면 그 값만 버린다.
 * 그래서 캐시 이름이 바뀌는 배포 뒤에도 형식이 맞는 지난 값은 Linear가 실패할 때 쓸 수 있다.
 */
export function keepValidSnapshot(serialized: string): PersistedClient {
  const client = JSON.parse(serialized) as PersistedClient
  client.clientState.queries = client.clientState.queries.filter(
    (q) =>
      q.queryKey[0] !== SNAPSHOT_QUERY_KEY[0] || snapshotSchema.safeParse(q.state.data).success,
  )
  return client
}
