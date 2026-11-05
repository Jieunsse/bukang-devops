import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FilterButton } from './FilterButton'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/shared/api/linear/query', () => ({ useSnapshot: () => ({ issues: [] }) }))

describe('필터 창', () => {
  it('모두 지우기는 테두리가 있는 버튼이고, 적용은 주 버튼이다', async () => {
    render(<FilterButton />)
    await userEvent.click(screen.getByRole('button', { name: /필터/ }))
    expect(screen.getByRole('button', { name: '모두 지우기' })).toHaveClass('button--outline')
    expect(screen.getByRole('button', { name: '적용' })).toHaveClass('button--primary')
  })
})
