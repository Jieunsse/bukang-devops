import { describe, expect, it } from 'vitest'

import { milestoneColumnWidth } from './milestone-width'

describe('마일스톤 칸 폭', () => {
  it('가장 긴 이름이 들어가도록 이름이 길수록 넓다', () => {
    const short = milestoneColumnWidth(['세미 발표'])
    const long = milestoneColumnWidth(['세미 발표', '충전 한도·이상 감지 메시지 전달 안정화'])
    expect(long).toBeGreaterThan(short)
  })

  // 칩 여백은 px-2.5(20px)와 글자 상자 양쪽 2px을 더한 24px, 칸 여백은 32px이다.
  it('한글 22자 이름도 칩 한 줄이 들어간다', () => {
    // macOS 브라우저에서 잰 이 이름의 글자 폭은 186px이다.
    expect(milestoneColumnWidth(['충전 한도·이상 감지 메시지 전달 안정화'])).toBeGreaterThanOrEqual(
      186 + 24 + 32,
    )
  })

  it('영문 대문자와 이모지가 많은 이름도 넉넉히 센다', () => {
    // 영문 대문자는 약 0.68em, 이모지는 약 1.2em이다(글자 12px).
    expect(milestoneColumnWidth(['PAYMENT GATEWAY MIGRATION'])).toBeGreaterThanOrEqual(
      25 * 0.68 * 12 + 24 + 32,
    )
    expect(milestoneColumnWidth(['🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀'])).toBeGreaterThanOrEqual(
      12 * 1.2 * 12 + 24 + 32,
    )
  })

  it('이름이 없거나 짧아도 「마일스톤 없음」과 칸 제목이 들어가는 폭은 둔다', () => {
    expect(milestoneColumnWidth([])).toBe(milestoneColumnWidth(['마일스톤 없음']))
    expect(milestoneColumnWidth(['A'])).toBeGreaterThanOrEqual(128)
  })
})
