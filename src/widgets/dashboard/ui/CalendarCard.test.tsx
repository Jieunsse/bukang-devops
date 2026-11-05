import { render, screen } from '@testing-library/react'
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
})
