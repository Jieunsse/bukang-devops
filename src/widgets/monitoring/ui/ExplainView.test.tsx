import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../api/actions', () => ({ refreshMonitoringAction: vi.fn() }))

const { ExplainView } = await import('./ExplainView')

describe('AI 해석', () => {
  it('세 줄과 해석을 만든 시각(한국 시간)을 보여 준다', () => {
    render(
      <ExplainView
        result={{
          status: 'ok',
          explanation: {
            status: '모두 정상이에요.',
            cause: '눈여겨볼 점이 없어요.',
            firstCheck: '게이트웨이 응답 시간을 봐요.',
            createdAt: '2026-11-18T01:05:00Z',
          },
        }}
      />,
    )
    expect(screen.getByText('모두 정상이에요.')).toBeInTheDocument()
    expect(screen.getByText('먼저 볼 곳')).toBeInTheDocument()
    expect(screen.getByText(/10:05 기준/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지표와 AI 해석 새로 받기' })).toBeInTheDocument()
  })

  it('키가 없으면 안내만 보이고 새로고침 버튼이 없다', () => {
    render(<ExplainView result={{ status: 'notConfigured' }} />)
    expect(screen.getByText('AI 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('실패하면 받지 못했다고 보이고 다시 시도할 수 있다', () => {
    render(<ExplainView result={{ status: 'failed' }} />)
    expect(screen.getByText('AI 해석을 받지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
