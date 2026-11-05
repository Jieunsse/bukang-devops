import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppSidebar } from './AppSidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('왼쪽 메뉴', () => {
  it('아래쪽에 도움말과 밝은·어두운 화면 전환 버튼이 있다', () => {
    render(<AppSidebar />)
    const footer = screen.getByRole('group', { name: '메뉴 아래쪽' })
    expect(within(footer).getByRole('button', { name: '도움말' })).toBeInTheDocument()
    expect(
      within(footer).getByRole('button', { name: '어두운 화면으로 바꾸기' }),
    ).toBeInTheDocument()
  })
})
