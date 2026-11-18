import { describe, expect, it } from 'vitest'

import { toResources } from './load'

const sample = (instance: string, value: number) => ({ labels: { instance }, value })

describe('서버 자원', () => {
  it('서버마다 한 줄로 묶고, 스왑이 없는 서버(0/0)는 null이다', () => {
    expect(
      toResources({
        memory: [sample('ip-10-0-1-145', 0.8), sample('10.0.2.222:9100', 0.4)],
        disk: [sample('ip-10-0-1-145', 0.78), sample('10.0.2.222:9100', 0.3)],
        swap: [sample('ip-10-0-1-145', Number.NaN)],
      }),
    ).toEqual([
      { name: '데이터 서버', memory: 0.4, disk: 0.3, swap: null },
      { name: '앱 서버', memory: 0.8, disk: 0.78, swap: null },
    ])
  })
})
