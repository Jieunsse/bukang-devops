import { describe, expect, it } from 'vitest'

import { gridOf } from './layout'

describe('숫자 카드 격자', () => {
  it('최대 열 수 안이면 한 줄에 모두 놓는다', () => {
    expect(gridOf(3, 4)).toEqual({ cols: 3, spanLast: 1 })
  })

  it('나누어떨어지는 가장 큰 열 수를 골라 빈칸을 만들지 않는다', () => {
    expect(gridOf(6, 4)).toEqual({ cols: 3, spanLast: 1 })
    expect(gridOf(8, 4)).toEqual({ cols: 4, spanLast: 1 })
  })

  it('어떻게 나눠도 남으면 마지막 카드가 남은 칸을 채운다', () => {
    // 7개를 6열로: 둘째 줄에 1장이 6칸을 모두 쓴다
    expect(gridOf(7, 6)).toEqual({ cols: 6, spanLast: 6 })
    // 5개를 4열로: 둘째 줄 1장이 4칸
    expect(gridOf(5, 4)).toEqual({ cols: 4, spanLast: 4 })
  })
})
