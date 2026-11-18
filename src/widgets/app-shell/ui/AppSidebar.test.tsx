import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppSidebar } from './AppSidebar'

let pathname = '/timeline'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams('assignee=jihun'),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const group = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  pathname = '/timeline'
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('왼쪽 메뉴', () => {
  it('아래쪽에 도움말과 밝은·어두운 화면 전환 버튼이 있다', () => {
    render(<AppSidebar />)
    const footer = screen.getByRole('group', { name: '메뉴 아래쪽' })
    expect(within(footer).getByRole('button', { name: '도움말' })).toBeInTheDocument()
    expect(
      within(footer).getByRole('button', { name: '어두운 화면으로 바꾸기' }),
    ).toBeInTheDocument()
  })

  it('맨 위 로고를 누르면 필터를 그대로 둔 채 대시보드로 간다', () => {
    render(<AppSidebar />)
    expect(screen.getByRole('link', { name: '부캉이 데브옵스' })).toHaveAttribute(
      'href',
      '/?assignee=jihun',
    )
  })

  it('처음에는 맨 위 세 메뉴와 그룹 이름만 보이고, 지금 페이지가 든 그룹은 펼쳐져 있다', () => {
    render(<AppSidebar />)
    const nav = screen.getByRole('navigation', { name: '페이지' })
    for (const name of ['대시보드', '달력', '모니터링']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(group('일정·작업')).toHaveAttribute('aria-expanded', 'true')
    expect(group('설계 문서')).toHaveAttribute('aria-expanded', 'false')
    expect(group('측정·기타')).toHaveAttribute('aria-expanded', 'false')
    expect(within(nav).getByRole('link', { name: '타임라인' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).queryByRole('link', { name: 'DB 구조' })).not.toBeInTheDocument()
  })

  it('그룹 이름을 누르면 펼쳐지고 접히며, 그 상태를 기억한다', () => {
    const { unmount } = render(<AppSidebar />)
    fireEvent.click(group('설계 문서'))
    expect(group('설계 문서')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'DB 구조' })).toHaveAttribute(
      'href',
      '/db?assignee=jihun',
    )
    unmount()
    render(<AppSidebar />)
    expect(group('설계 문서')).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(group('설계 문서'))
    expect(group('설계 문서')).toHaveAttribute('aria-expanded', 'false')
  })

  it('저장소를 쓸 수 없어도 메뉴가 깨지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<AppSidebar />)
    fireEvent.click(group('측정·기타'))
    expect(group('측정·기타')).toHaveAttribute('aria-expanded', 'true')
  })

  it('대시보드 탭 같은 하위 주소에서도 모니터링이 선택돼 보인다', () => {
    pathname = '/monitoring/rYdddlPWk'
    render(<AppSidebar />)
    const nav = screen.getByRole('navigation', { name: '페이지' })
    expect(within(nav).getByRole('link', { name: '모니터링' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
