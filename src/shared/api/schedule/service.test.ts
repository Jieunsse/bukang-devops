import { beforeEach, describe, expect, it, vi } from 'vitest'

import { passwordMatches } from './password'
import type { ScheduleStore } from './service'
import { writeSchedule } from './service'

const PASSWORD = 'team-secret'
const input = { title: '개발 마감', start: '2026-11-18', end: '2026-11-18' }

const fakeStore = () =>
  ({
    list: vi.fn(async () => []),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  }) satisfies ScheduleStore

let store: ReturnType<typeof fakeStore>
beforeEach(() => {
  store = fakeStore()
})

const wrote = () =>
  store.create.mock.calls.length + store.update.mock.calls.length + store.remove.mock.calls.length

describe('팀 비밀번호 확인', () => {
  it('같을 때만 맞다고 본다', () => {
    expect(passwordMatches(PASSWORD, PASSWORD)).toBe(true)
    expect(passwordMatches('team-secreT', PASSWORD)).toBe(false)
    expect(passwordMatches('team', PASSWORD)).toBe(false)
  })

  it('서버에 비밀번호가 정해져 있지 않으면 무엇을 넣어도 틀렸다고 본다', () => {
    expect(passwordMatches('', undefined)).toBe(false)
    expect(passwordMatches('', '')).toBe(false)
    expect(passwordMatches('아무거나', undefined)).toBe(false)
  })
})

describe('일정 저장', () => {
  it.each([
    ['비밀번호 없음', undefined],
    ['빈 비밀번호', ''],
    ['틀린 비밀번호', 'wrong'],
    ['문자가 아닌 비밀번호', 1234],
  ])('%s이면 거절하고 저장하지 않는다', async (_, given) => {
    const result = await writeSchedule(store, PASSWORD, given, { kind: 'create', input })
    expect(result).toEqual({ ok: false, reason: 'password' })
    expect(wrote()).toBe(0)
  })

  it('서버에 비밀번호가 정해져 있지 않으면 거절한다', async () => {
    const result = await writeSchedule(store, undefined, '', { kind: 'create', input })
    expect(result).toEqual({ ok: false, reason: 'password' })
    expect(wrote()).toBe(0)
  })

  it('비밀번호가 맞으면 추가한다. 제목 앞뒤 빈칸은 지운다', async () => {
    const result = await writeSchedule(store, PASSWORD, PASSWORD, {
      kind: 'create',
      input: { ...input, title: '  개발 마감  ' },
    })
    expect(result).toEqual({ ok: true })
    expect(store.create).toHaveBeenCalledWith(input)
  })

  it('비밀번호가 맞으면 고치고 지운다', async () => {
    await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'update', id: 'a1', input })
    await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'delete', id: 'a1' })
    expect(store.update).toHaveBeenCalledWith('a1', input)
    expect(store.remove).toHaveBeenCalledWith('a1')
  })

  it.each([
    ['빈 제목', { ...input, title: '   ' }],
    ['너무 긴 제목', { ...input, title: '가'.repeat(61) }],
    ['날짜 모양이 아님', { ...input, start: '11/18' }],
    ['달력에 없는 날짜', { ...input, start: '2026-02-30', end: '2026-03-01' }],
    ['종료일이 시작일보다 빠름', { ...input, start: '2026-11-18', end: '2026-11-17' }],
    ['빠진 칸', { title: '개발 마감' }],
  ])('%s이면 거절하고 저장하지 않는다', async (_, bad) => {
    const result = await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'create', input: bad })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(wrote()).toBe(0)
  })

  it.each([
    ['빈 문자열', ''],
    ['문자가 아님', 1],
    ['경로 문자가 섞임', 'a/b'],
  ])('일정 번호가 %s이면 거절한다', async (_, id) => {
    expect(await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'delete', id })).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'update', id, input })).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(wrote()).toBe(0)
  })

  it('모르는 요청은 거절한다', async () => {
    const result = await writeSchedule(store, PASSWORD, PASSWORD, { kind: 'drop' })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
    expect(wrote()).toBe(0)
  })
})
