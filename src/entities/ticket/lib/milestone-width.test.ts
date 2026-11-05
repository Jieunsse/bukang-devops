import { describe, expect, it } from 'vitest'

import { milestoneColumnWidth } from './milestone-width'

describe('마일스톤 칸 폭', () => {
  it('가장 긴 이름이 들어가도록 이름이 길수록 넓다', () => {
    const short = milestoneColumnWidth(['세미 발표'])
    const long = milestoneColumnWidth(['세미 발표', '충전 한도·이상 감지 메시지 전달 안정화'])
    expect(long).toBeGreaterThan(short)
  })

  it('한글 22자 이름도 칩 한 줄(글자 12px, 칩 여백 20px, 칸 여백 32px)이 들어간다', () => {
    // 브라우저에서 잰 이 이름의 글자 폭은 186px이다.
    expect(milestoneColumnWidth(['충전 한도·이상 감지 메시지 전달 안정화'])).toBeGreaterThanOrEqual(
      186 + 20 + 32,
    )
  })

  it('이름이 없거나 짧아도 「마일스톤 없음」과 칸 제목이 들어가는 폭은 둔다', () => {
    expect(milestoneColumnWidth([])).toBe(milestoneColumnWidth(['마일스톤 없음']))
    expect(milestoneColumnWidth(['A'])).toBeGreaterThanOrEqual(128)
  })
})
