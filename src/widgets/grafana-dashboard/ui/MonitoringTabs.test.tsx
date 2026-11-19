import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let search = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => search,
  usePathname: () => '/monitoring/detail',
  useRouter: () => ({ push: vi.fn() }),
}))

const { MonitoringTabs } = await import('./MonitoringTabs')

beforeEach(() => {
  search = new URLSearchParams()
})

describe('모니터링 탭', () => {
  it('대시보드 목록이 비어도 요약과 상세 지표로 갈 수 있고, 지금 탭을 표시한다', () => {
    render(<MonitoringTabs links={[]} current="detail" />)
    expect(screen.getByRole('link', { name: '요약' })).toHaveAttribute('href', '/monitoring')
    expect(screen.getByRole('link', { name: '상세 지표' })).toHaveAttribute('aria-current', 'page')
  })

  it('고른 기간이 탭 주소에 따라가고, 기간 고르기에 지금 기간이 보인다', () => {
    search = new URLSearchParams('range=7d&v.job=order')
    render(<MonitoringTabs links={[{ uid: 'jvm', name: 'JVM' }]} current="detail" />)
    expect(screen.getByRole('link', { name: '요약' })).toHaveAttribute(
      'href',
      '/monitoring?range=7d',
    )
    expect(screen.getByRole('link', { name: 'JVM' })).toHaveAttribute(
      'href',
      '/monitoring/jvm?range=7d',
    )
    expect(screen.getAllByText('7일').length).toBeGreaterThan(0)
  })
})
