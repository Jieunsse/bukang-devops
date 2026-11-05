import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Snapshot } from '@/shared/api/linear'

const { getSnapshot, updateTag } = vi.hoisted(() => ({
  getSnapshot: vi.fn<() => Promise<Snapshot>>(),
  updateTag: vi.fn(),
}))
vi.mock('@/shared/api/linear/server', () => ({ getSnapshot, SNAPSHOT_TAG: 'linear-snapshot' }))
vi.mock('next/cache', () => ({ updateTag }))

const { decideRefresh, refreshSnapshot } = await import('./refresh')

const snap = (fetchedAt: string): Snapshot => ({ fetchedAt, issues: [], cycles: [] })

describe('새로고침 1분 제한', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T03:01:00.000Z'))
    getSnapshot.mockReset()
    updateTag.mockReset()
  })

  it('1분 안이면 몇 초 전에 받았는지 알려 주고 막는다', () => {
    expect(decideRefresh('2026-11-05T03:00:30.000Z', Date.now())).toEqual({
      allowed: false,
      secondsAgo: 30,
    })
  })

  it('딱 1분이 지나면 허용한다', () => {
    expect(decideRefresh('2026-11-05T03:00:00.000Z', Date.now())).toEqual({ allowed: true })
  })

  it('1분 안에 누르면 서버 캐시를 비우지 않고 지금 값을 돌려준다', async () => {
    getSnapshot.mockResolvedValue(snap('2026-11-05T03:00:45.000Z'))
    const result = await refreshSnapshot()
    expect(updateTag).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'tooSoon',
      secondsAgo: 15,
      snapshot: snap('2026-11-05T03:00:45.000Z'),
    })
  })

  it('1분이 지났으면 서버 캐시를 비우고 새로 받은 값을 돌려준다', async () => {
    getSnapshot
      .mockResolvedValueOnce(snap('2026-11-05T02:50:00.000Z'))
      .mockResolvedValueOnce(snap('2026-11-05T03:01:00.000Z'))
    const result = await refreshSnapshot()
    expect(updateTag).toHaveBeenCalledWith('linear-snapshot')
    expect(result).toEqual({ status: 'refreshed', snapshot: snap('2026-11-05T03:01:00.000Z') })
  })
})
