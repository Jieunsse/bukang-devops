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
export const getSnapshot: () => Promise<Snapshot> = unstable_cache(
  async () => {
    const source = getLinearSource()
    return source.kind === 'live' ? fetchSnapshot(source.apiKey) : createFixtureSnapshot()
  },
  ['linear-snapshot-v1'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)

export { MissingApiKeyError } from '../../config/env'
