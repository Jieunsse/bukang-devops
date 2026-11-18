import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
    // 끊긴 뒤 새로 시작하므로 M이 두 번 나온다
    expect(container.querySelector('path')?.getAttribute('d')?.match(/M/g)).toHaveLength(2)
  })

  it('기록이 없으면 안내 문구만 보인다', () => {
    render(<TrendChart title="초당 요청" points={[[0, null]]} format={format} />)
    expect(screen.getByText('최근 1시간 기록이 없어요')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
