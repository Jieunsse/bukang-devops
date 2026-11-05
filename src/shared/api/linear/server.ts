import 'server-only'

import { unstable_cache } from 'next/cache'

import { getLinearSource, MissingApiKeyError } from '../../config/env'
import { fetchSnapshot, LinearRequestError, LinearResponseError } from './fetch-snapshot'
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
  ['linear-snapshot-v7'],
  { revalidate: TEN_MINUTES, tags: [SNAPSHOT_TAG] },
)

export { MissingApiKeyError }

/** 화면에 짧게 보여 줄 실패 이유 */
function failureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/rate ?limit|ratelimited/i.test(message)) return 'Linear 요청 한도에 걸렸어요'
  if (error instanceof LinearResponseError) return 'Linear 응답 형식이 달라졌어요'
  if (error instanceof LinearRequestError) return 'Linear가 요청을 받지 않았어요'
  return 'Linear에 연결하지 못했어요'
}

// 이 서버 인스턴스에서 마지막으로 받은 값. 서버 캐시가 비었을 때 Linear가 실패해도 이 값을 보여 준다.
// shortcut: 인스턴스마다 따로라 새로 뜬 인스턴스에는 없다. 그때는 브라우저에 남긴 값을 쓴다.
let lastGood: Snapshot | null = null

export type SnapshotResult = { snapshot: Snapshot } | { snapshot: null; failure: string }

/**
 * 끝나지 않은 티켓과 사이클을 서버 캐시에서 읽는다. 캐시가 오래되면 다음 요청은 지난 값을 받고 뒤에서 새로 받는다.
 * 뒤에서 새로 받다가 실패하면 Next가 지난 캐시 값을 그대로 둔다. 캐시가 비었을 때 실패하면 마지막 성공 값을 쓴다.
 * 운영에서 키가 없는 것은 숨기지 않고 오류를 낸다.
 */
export async function loadSnapshot(): Promise<SnapshotResult> {
  try {
    lastGood = await getSnapshot()
    return { snapshot: lastGood }
  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error
    console.error('Linear에서 새로 받지 못했어요', error)
    const failure = failureReason(error)
    return lastGood ? { snapshot: { ...lastGood, failure } } : { snapshot: null, failure }
  }
}
