import { describe, expect, it } from 'vitest'

import type { Cycle } from '@/shared/api/linear'

import { currentPeriod, periodText } from './period'

// 사이클 7: 한국 시간 11/9(월) 00:00 ~ 11/16(월) 00:00
const cycle7: Cycle = {
  id: 'c7',
  number: 7,
  name: null,
  startsAt: '2026-11-08T15:00:00.000Z',
  endsAt: '2026-11-15T15:00:00.000Z',
}

describe('지금 기간', () => {
  it('사이클 시작 시각이면 그 사이클 안이다', () => {
    expect(currentPeriod('2026-11-08T15:00:00.000Z', [cycle7])).toEqual({
      kind: 'cycle',
      cycle: cycle7,
      start: '2026-11-09',
      end: '2026-11-15',
    })
  })

  it('사이클 끝 시각이 되면 사이클 밖이다', () => {
    // 한국 시간 11/16(월) 00:00 → 그 주 일요일 11/22까지
    expect(currentPeriod('2026-11-15T15:00:00.000Z', [cycle7])).toEqual({
      kind: 'outside',
      start: '2026-11-16',
      end: '2026-11-22',
    })
  })

  it('사이클이 없으면 오늘부터 이번 주 일요일까지다', () => {
    // 한국 시간 11/5(목)
    expect(currentPeriod('2026-11-05T03:00:00.000Z', [])).toEqual({
      kind: 'outside',
      start: '2026-11-05',
      end: '2026-11-08',
    })
  })

  it('오늘이 일요일이면 사이클 밖 기간은 오늘 하루다', () => {
    expect(currentPeriod('2026-11-08T03:00:00.000Z', [])).toEqual({
      kind: 'outside',
      start: '2026-11-08',
      end: '2026-11-08',
    })
  })

  it('일요일 전에 다음 사이클이 시작하면 그 전날까지만 사이클 밖이다', () => {
    // 다음 사이클이 한국 시간 11/7(토) 00:00에 시작
    const next: Cycle = { ...cycle7, startsAt: '2026-11-06T15:00:00.000Z' }
    expect(currentPeriod('2026-11-05T03:00:00.000Z', [next])).toEqual({
      kind: 'outside',
      start: '2026-11-05',
      end: '2026-11-06',
    })
  })

  it('사이클 끝이 한국 자정이 아니어도 끝 시각이 속한 날까지다', () => {
    const odd: Cycle = { ...cycle7, endsAt: '2026-11-15T20:00:00.000Z' }
    expect(currentPeriod('2026-11-10T00:00:00.000Z', [odd])).toMatchObject({
      kind: 'cycle',
      end: '2026-11-16',
    })
  })
})

describe('기간 표시 문구', () => {
  const cycle8: Cycle = {
    ...cycle7,
    id: 'c8',
    number: 8,
    startsAt: '2026-11-15T15:00:00.000Z',
    endsAt: '2026-11-22T15:00:00.000Z',
  }
  const text = (now: string, cycles: Cycle[]) => periodText(currentPeriod(now, cycles), cycles, now)

  it('사이클 중이면 사이클 번호와 요일 붙은 기간, 며칠째인지 적는다', () => {
    // 한국 시간 11/11(수) 12:00은 사이클 7의 3일째다.
    expect(text('2026-11-11T03:00:00.000Z', [cycle7, cycle8])).toEqual({
      name: '사이클 7',
      range: '11/9(월) ~ 11/15(일)',
      day: '3일째 / 7일',
    })
  })

  it('사이클 이름이 있으면 번호 뒤에 붙인다', () => {
    expect(text('2026-11-11T03:00:00.000Z', [{ ...cycle7, name: '데모 준비' }]).name).toBe(
      '사이클 7 데모 준비',
    )
  })

  it('사이클 밖이면 다음 사이클 번호로 「사이클 N 시작 전」이라고 적는다', () => {
    // 한국 시간 11/5(목). 사이클 밖 기간은 11/8(일)까지 4일이다.
    expect(text('2026-11-05T03:00:00.000Z', [cycle8, cycle7])).toEqual({
      name: '사이클 7 시작 전',
      range: '11/5(목) ~ 11/8(일)',
      day: '1일째 / 4일',
    })
  })

  it('다음 사이클이 없으면 「사이클 밖 기간」이라고 적는다', () => {
    expect(text('2026-12-01T03:00:00.000Z', [cycle7]).name).toBe('사이클 밖 기간')
  })

  it('한국 시간 월요일 0시가 되면 사이클 첫날로 바뀐다', () => {
    expect(text('2026-11-08T14:59:59.999Z', [cycle7]).name).toBe('사이클 7 시작 전')
    expect(text('2026-11-08T15:00:00.000Z', [cycle7])).toMatchObject({
      name: '사이클 7',
      day: '1일째 / 7일',
    })
  })
})
