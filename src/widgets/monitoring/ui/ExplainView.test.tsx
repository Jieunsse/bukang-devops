import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../api/actions', () => ({ refreshMonitoringAction: vi.fn() }))

const { ExplainView } = await import('./ExplainView')

describe('AI 리포트', () => {
  it('요약·눈여겨볼 것·네 칸과 리포트를 만든 시각(한국 시간)을 모두 보여 준다', () => {
    render(
      <ExplainView
        result={{
          status: 'ok',
          explanation: {
            summary: '모두 정상이에요.',
            watch: [
              {
                what: '게이트웨이 응답 시간',
                when: '19:43',
                howMuch: '1.1초',
                impact: '예매 화면이 느렸을 수 있어요.',
              },
            ],
            causes: [{ guess: 'DB 연결 대기', evidence: '근거 지표 없음' }],
            services: ['특이 사항 없음'],
            resources: ['앱 서버 메모리 80.4%로 기준 90%까지 여유가 있어요.'],
            nextSteps: [{ tab: 'JVM', action: '게이트웨이 GC 멈춤 시간을 봐요.' }],
            createdAt: '2026-11-18T01:05:00Z',
          },
        }}
      />,
    )
    expect(screen.getByText('모두 정상이에요.')).toBeInTheDocument()
    expect(screen.getByText(/게이트웨이 응답 시간 · 19:43 · 1.1초/)).toBeInTheDocument()
    expect(screen.getByText('근거: 근거 지표 없음')).toBeInTheDocument()
    expect(screen.getByText('특이 사항 없음')).toBeInTheDocument()
    expect(screen.getByText(/기준 90%까지/)).toBeInTheDocument()
    expect(screen.getByText('JVM 탭')).toBeInTheDocument()
    expect(screen.getByText(/10:05 기준/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지표와 AI 리포트 새로 받기' })).toBeInTheDocument()
  })

  it('키가 없으면 안내만 보이고 새로고침 버튼이 없다', () => {
    render(<ExplainView result={{ status: 'notConfigured' }} />)
    expect(screen.getByText('AI 연결 정보가 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('실패하면 받지 못했다고 보이고 다시 시도할 수 있다', () => {
    render(<ExplainView result={{ status: 'failed' }} />)
    expect(screen.getByText('AI 리포트를 받지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
