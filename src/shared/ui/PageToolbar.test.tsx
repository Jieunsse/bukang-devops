import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageToolbar } from './PageToolbar'

describe('페이지 도구 줄', () => {
  it('왼쪽에 제목과 개수, 오른쪽에 버튼, 아래에 고른 조건을 둔다', () => {
    render(
      <PageToolbar title="마감 목록" summary="41건" actions={<button>필터</button>}>
        <span>담당자: 지훈</span>
      </PageToolbar>,
    )
    const bar = screen.getByRole('group', { name: '마감 목록 도구' })
    expect(within(bar).getByRole('heading', { name: '마감 목록' })).toBeInTheDocument()
    expect(within(bar).getByText('41건')).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: '필터' })).toBeInTheDocument()
    expect(within(bar).getByText('담당자: 지훈')).toBeInTheDocument()
  })
})
