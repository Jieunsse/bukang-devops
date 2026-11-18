import { describe, expect, it } from 'vitest'

import { monotonePath, seriesStats } from './chart'

describe('그래프 계산', () => {
  it('곡선은 평평한 구간에서 위아래로 튀지 않는다', () => {
    expect(
      monotonePath([
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ]),
    ).toContain('C3.3,10.0 6.7,10.0 10.0,10.0')
  })

  it('지금·평균·최대는 빈 값을 빼고 계산한다', () => {
    expect(
      seriesStats([
        [0, 1],
        [60, null],
        [120, 5],
      ]),
    ).toEqual({ latest: 5, avg: 3, max: 5, min: 1 })
    expect(seriesStats([[0, null]])).toEqual({ latest: null, avg: null, max: null, min: null })
  })
})
