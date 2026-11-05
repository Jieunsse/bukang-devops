import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CalendarCard } from './CalendarCard'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams('assignee=u1'),
}))

describe('대시보드 달력 카드', () => {
  it('「크게 보기」를 누르면 필터를 유지한 채 달력 페이지로 간다', () => {
    render(
      <CalendarCard
        counts={new Map()}
        cycles={[]}
        today="2026-11-05"
        selected={null}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('link', { name: '크게 보기' })).toHaveAttribute(
      'href',
      '/calendar?assignee=u1',
    )
  })

  const show = (counts = new Map<string, number>()) =>
    render(
      <CalendarCard
        counts={counts}
        cycles={[]}
        today="2026-11-05"
        selected={null}
        onSelect={vi.fn()}
      />,
    )

  // 툴팁은 칸 안쪽 영역에 마우스를 올렸을 때 뜬다.
  const hoverDay = async (name: RegExp) => {
    await userEvent.hover(document.body)
    const cell = screen.getByRole('button', { name })
    await userEvent.hover(cell.querySelector('[data-slot="tooltip-trigger"]')!)
    return screen.findByRole('tooltip')
  }

  it('제목은 「달력」이고 카드 아래 범례 문구가 없다', () => {
    show()
    expect(screen.getByText('달력')).toBeInTheDocument()
    expect(screen.queryByText('사이클 기간')).not.toBeInTheDocument()
    expect(screen.queryByText(/남은 티켓 수예요/)).not.toBeInTheDocument()
  })

  it('티켓이 있는 날에 마우스를 올리면 남은 티켓 수를 툴팁으로 알려 준다', async () => {
    show(new Map([['2026-11-09', 2]]))
    expect(await hoverDay(/11월 9일/)).toHaveTextContent('기한인 남은 티켓 2건')
  })

  it('최종 발표일에 마우스를 올리면 「최종 발표」를 툴팁으로 알려 준다', async () => {
    show()
    expect(await hoverDay(/11월 23일/)).toHaveTextContent('최종 발표')
  })
})
