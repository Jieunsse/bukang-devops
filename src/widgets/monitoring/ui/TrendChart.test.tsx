import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { monotonePath } from '@/shared/lib/chart'

import { TrendChart } from './TrendChart'

const format = (v: number) => `${v}건`

describe('선 그래프', () => {
  it('지금 값과 가장 높은 값을 보여 주고, 값이 없는 시각에서 선을 끊는다', () => {
    const { container } = render(
      <TrendChart
        title="초당 요청"
        points={[
          [0, 1],
          [60, null],
          [120, 4],
          [180, 2],
        ]}
        format={format}
      />,
    )
    expect(screen.getByText('지금 2건')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /가장 높을 때 4건/ })).toBeInTheDocument()
    // 끊긴 곳을 기준으로 구간 두 개가 각각 면과 선으로 그려진다
    expect(container.querySelectorAll('path')).toHaveLength(4)
  })

  it('기록이 없으면 안내 문구만 보인다', () => {
    render(<TrendChart title="초당 요청" points={[[0, null]]} format={format} />)
    expect(screen.getByText('최근 1시간 기록이 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('큰 숫자 모드는 지금 값과 1시간 전 대비 증감을 보여 준다', () => {
    render(
      <TrendChart
        title="전체 초당 요청"
        points={[
          [0, 3],
          [60, 1],
        ]}
        format={format}
        hero
      />,
    )
    expect(screen.getByText('1건')).toBeInTheDocument()
    expect(screen.getByTitle('1시간 전과 비교')).toHaveTextContent('−2건')
  })

  it('마우스를 올리면 그 시각과 값이 툴팁으로 보인다', () => {
    render(
      <TrendChart
        title="초당 요청"
        points={[
          [0, 1],
          [60, 5],
        ]}
        format={format}
      />,
    )
    const svg = screen.getByRole('img')
    svg.getBoundingClientRect = () => ({ left: 0, width: 320 }) as DOMRect
    fireEvent.pointerMove(svg, { clientX: 320 })
    expect(screen.getByRole('tooltip')).toHaveTextContent('5건')
    fireEvent.pointerLeave(svg)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('곡선은 점 사이에서 이웃 값보다 넘치지 않는다(평평한 구간은 수평)', () => {
    const d = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])
    // 첫 구간의 두 조절점 y가 모두 10이라 위아래로 튀지 않는다
    expect(d).toContain('C3.3,10.0 6.7,10.0 10.0,10.0')
  })
})
