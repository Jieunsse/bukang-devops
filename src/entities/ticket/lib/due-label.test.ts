import { describe, expect, it } from 'vitest'

import { dueLabel } from './due-label'

describe('기한 표시', () => {
  const today = '2026-11-05'

  it('지난 기한은 며칠 지났는지 빨강으로 보여 준다', () => {
    expect(dueLabel('2026-11-02', today)).toEqual({ text: '3일 지남', tone: 'danger' })
  })

  it('오늘 기한은 주황으로 보여 준다', () => {
    expect(dueLabel('2026-11-05', today)).toEqual({ text: '오늘', tone: 'warning' })
  })

  it('남은 기한은 날짜와 남은 날을 회색으로 보여 준다', () => {
    expect(dueLabel('2026-11-08', today)).toEqual({ text: '11/8 (D-3)', tone: 'default' })
  })

  it('기한이 없으면 기한 없음이다', () => {
    expect(dueLabel(null, today)).toEqual({ text: '기한 없음', tone: 'default' })
  })
})
