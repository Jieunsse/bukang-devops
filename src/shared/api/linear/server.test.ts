import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Snapshot } from './schema'

const { fetchSnapshot } = vi.hoisted(() => ({ fetchSnapshot: vi.fn() }))
// 서버 캐시는 거치지 않고 함수를 그대로 부른다. 캐시가 비었을 때와 같다.
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }))
vi.mock('./fetch-snapshot', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./fetch-snapshot')>()),
  fetchSnapshot,
}))

const { LinearRequestError, LinearResponseError } = await import('./fetch-snapshot')

const snap = (fetchedAt: string): Snapshot => ({ fetchedAt, issues: [], cycles: [] })

/** 서버 인스턴스를 새로 띄운 것처럼, 기억해 둔 마지막 성공 값이 없는 상태로 불러온다. */
const freshServer = async () => {
  vi.resetModules()
  return import('./server')
}

describe('Linear가 실패할 때 마지막 성공 값', () => {
  beforeEach(() => {
    vi.stubEnv('LINEAR_API_KEY', 'k')
    fetchSnapshot.mockReset()
  })

  it('성공하면 받은 값을 실패 표시 없이 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot.mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
    expect(await loadSnapshot()).toEqual({ snapshot: snap('2026-11-05T02:40:00.000Z') })
  })

  it('실패하면 오류 대신 마지막 성공 값과 실패 이유를 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot
      .mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
      .mockRejectedValueOnce(new LinearRequestError('Linear 요청 실패(400): Rate limit exceeded'))
    await loadSnapshot()
    expect(await loadSnapshot()).toEqual({
      snapshot: { ...snap('2026-11-05T02:40:00.000Z'), failure: 'Linear 요청 한도에 걸렸어요' },
    })
  })

  it('응답 형식이 바뀌어 실패하면 그 이유를 짧게 적는다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot
      .mockResolvedValueOnce(snap('2026-11-05T02:40:00.000Z'))
      .mockRejectedValueOnce(new LinearResponseError('Linear 응답 형식이 달라요: ...'))
    await loadSnapshot()
    expect((await loadSnapshot()).snapshot?.failure).toBe('Linear 응답 형식이 달라졌어요')
  })

  it('한 번도 성공한 적이 없으면 보여 줄 값 없이 실패 이유만 돌려준다', async () => {
    const { loadSnapshot } = await freshServer()
    fetchSnapshot.mockRejectedValueOnce(new Error('network down'))
    expect(await loadSnapshot()).toEqual({
      snapshot: null,
      failure: 'Linear에 연결하지 못했어요',
    })
  })

  it('운영에서 키가 없으면 지난 값으로 숨기지 않고 오류를 그대로 낸다', async () => {
    vi.stubEnv('LINEAR_API_KEY', '')
    vi.stubEnv('VERCEL_ENV', 'production')
    const { loadSnapshot, MissingApiKeyError } = await freshServer()
    await expect(loadSnapshot()).rejects.toBeInstanceOf(MissingApiKeyError)
    vi.stubEnv('VERCEL_ENV', '')
  })
})
