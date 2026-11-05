import 'server-only'

import { updateTag } from 'next/cache'

import type { Snapshot } from '@/shared/api/linear'
import { getSnapshot, SNAPSHOT_TAG } from '@/shared/api/linear/server'

const ONE_MINUTE_MS = 60_000

export type RefreshDecision = { allowed: true } | { allowed: false; secondsAgo: number }

export function decideRefresh(fetchedAt: string, nowMs: number): RefreshDecision {
  const elapsed = nowMs - Date.parse(fetchedAt)
  return elapsed >= ONE_MINUTE_MS
    ? { allowed: true }
    : { allowed: false, secondsAgo: Math.max(0, Math.floor(elapsed / 1000)) }
}

export type RefreshResult =
  | { status: 'refreshed'; snapshot: Snapshot }
  | { status: 'tooSoon'; secondsAgo: number; snapshot: Snapshot }

/**
 * 서버 캐시를 비우고 Linear에서 새로 받는다.
 * 받은 시각은 서버 캐시에 들어 있어서, 누가 눌렀든 서버 전체에서 1분에 한 번만 Linear를 부른다.
 */
export async function refreshSnapshot(): Promise<RefreshResult> {
  const current = await getSnapshot()
  const decision = decideRefresh(current.fetchedAt, Date.now())
  if (!decision.allowed) {
    return { status: 'tooSoon', secondsAgo: decision.secondsAgo, snapshot: current }
  }
  updateTag(SNAPSHOT_TAG)
  return { status: 'refreshed', snapshot: await getSnapshot() }
}
