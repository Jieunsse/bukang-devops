import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource } from '../../config/env'
import { fetchSnapshot } from './fetch-snapshot'
import { createFixtureSnapshot } from './fixture'
import type { Snapshot } from './schema'

export const SNAPSHOT_TAG = 'linear-snapshot'
const TEN_MINUTES = 600

/**
 * 끝나지 않은 티켓과 사이클. 서버 전체가 10분 동안 같은 값을 나눠 쓴다.
 * 10분이 지나면 다음 요청은 지난 값을 받고, 뒤에서 새로 받는다.
 */
/** 서버 캐시를 거치지 않고 지금 바로 받는다. */
export async function fetchFreshSnapshot(): Promise<Snapshot> {
  const source = getLinearSource()
  return source.kind === 'live' ? fetchSnapshot(source.apiKey) : createFixtureSnapshot()
}

// 새로고침이 이미 받아 둔 값. 캐시를 다시 채울 때 Linear를 한 번 더 부르지 않으려고 둔다.
let primed: Snapshot | null = null

/** 다음에 캐시를 채울 때 이 값을 쓴다. */
export function primeNextSnapshot(snapshot: Snapshot) {
  primed = snapshot
}

export const getSnapshot: () => Promise<Snapshot> = unstable_cache(
  async () => {
    const next = primed
    primed = null
    return next ?? fetchFreshSnapshot()
  },
  ['linear-snapshot-v3'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)

export { MissingApiKeyError } from '../../config/env'
