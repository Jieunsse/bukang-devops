import { describe, expect, it } from 'vitest'

import { getScheduleStore, MissingFirebaseError } from './store'

describe('일정 저장소 고르기', () => {
  it('Vercel 운영과 미리보기에서 Firebase 값이 없으면 오류를 낸다', () => {
    expect(() => getScheduleStore({ VERCEL_ENV: 'production' })).toThrow(MissingFirebaseError)
    expect(() => getScheduleStore({ VERCEL_ENV: 'preview' })).toThrow(MissingFirebaseError)
    expect(() => getScheduleStore({ VERCEL_ENV: 'production', FIREBASE_PROJECT_ID: 'p' })).toThrow(
      MissingFirebaseError,
    )
  })

  it('로컬 개발 서버에서 값이 없으면 서버 메모리에 저장한다', async () => {
    const store = getScheduleStore({})
    await store.create({ title: '리허설', start: '2026-11-20', end: '2026-11-20' })
    const [saved] = await store.list()
    expect(saved).toMatchObject({ title: '리허설' })
    expect(await store.update(saved!.id, { ...saved!, title: '최종 리허설' })).toBe(true)
    expect(await store.update('gone', { ...saved!, title: 'x' })).toBe(false)
    await store.remove(saved!.id)
    expect(await store.list()).toEqual([])
  })
})
