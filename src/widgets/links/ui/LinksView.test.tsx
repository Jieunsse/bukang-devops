import { render, screen } from '@testing-library/react'
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { REPORTS } from '../model/reports'
import { LinksView } from './LinksView'

describe('링크 모음', () => {
  it('리포트마다 앱 안에서 보는 주소만 있고, 공유 키가 붙은 원본 주소는 보이지 않는다', () => {
    const { container } = render(<LinksView />)
    expect(
      screen.getAllByRole('link', { name: '여기서 보기' }).map((a) => a.getAttribute('href')),
    ).toEqual(REPORTS.map((r) => `/links/${r.slug}`))
    expect(container.innerHTML).not.toContain('claude.ai')
  })

  it('리포트마다 암호화한 복사본이 있다', () => {
    for (const r of REPORTS) expect(existsSync(`reports/${r.slug}.enc.json`)).toBe(true)
  })
})
