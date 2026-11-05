import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LabelChip, MilestoneChip } from './TicketChips'

describe('라벨 칩', () => {
  it('Linear 라벨 색을 옅게 깔고 글자도 그 색으로 맞춘다', () => {
    render(<LabelChip label={{ id: 'l1', name: '프론트', color: '#4ea7fc' }} />)
    const chip = screen.getByText('프론트').closest('.chip') as HTMLElement
    expect(chip.style.backgroundColor).toMatch(/#4ea7fc|rgb\(78, 167, 252\)/)
    expect(chip.style.color).toMatch(/#4ea7fc|rgb\(78, 167, 252\)/)
  })

  it('색이 없는 라벨은 기본 회색 칩이다', () => {
    render(<LabelChip label={{ id: 'l1', name: '문서' }} />)
    const chip = screen.getByText('문서').closest('.chip') as HTMLElement
    expect(chip.style.backgroundColor).toBe('')
  })

  it('라벨과 마일스톤 칩은 같은 크기와 안쪽 여백을 쓴다', () => {
    // 마일스톤 칸 폭 계산(milestoneColumnWidth)이 이 여백(px-2.5)을 전제로 한다.
    render(
      <>
        <LabelChip label={{ id: 'l1', name: '문서' }} />
        <MilestoneChip name="세미 발표" />
      </>,
    )
    expect(screen.getByText('문서').closest('.chip')).toHaveClass('h-6', 'px-2.5')
    expect(screen.getByText('세미 발표').closest('.chip')).toHaveClass('h-6', 'px-2.5')
  })

  it('긴 라벨은 한 줄로 자르고 전체 이름을 마우스 올림 설명으로 남긴다', () => {
    render(<LabelChip label={{ id: 'l1', name: '아주 긴 라벨 이름입니다' }} />)
    expect(screen.getByTitle('아주 긴 라벨 이름입니다')).toHaveClass('truncate')
  })
})

describe('마일스톤 칩', () => {
  it('이름을 자르지 않고 한 줄로 보여 준다', () => {
    render(<MilestoneChip name="충전 한도·이상 감지" />)
    const name = screen.getByText('충전 한도·이상 감지')
    expect(name).not.toHaveClass('truncate')
    expect(name.closest('.chip')).toHaveClass('whitespace-nowrap')
  })

  it('마일스톤이 없으면 「마일스톤 없음」으로 적는다', () => {
    render(<MilestoneChip name={null} />)
    expect(screen.getByText('마일스톤 없음')).toBeInTheDocument()
  })
})
