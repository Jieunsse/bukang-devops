import { describe, expect, it } from 'vitest'

import { readGrafanaConfig } from './config'

describe('그라파나 연결 정보', () => {
  it('주소와 토큰이 모두 있어야 쓴다', () => {
    expect(readGrafanaConfig({ GRAFANA_URL: 'https://g.example' })).toBeNull()
    expect(readGrafanaConfig({ GRAFANA_TOKEN: 't' })).toBeNull()
    expect(readGrafanaConfig({ GRAFANA_URL: ' ', GRAFANA_TOKEN: 't' })).toBeNull()
  })

  it('주소 끝의 / 는 뺀다', () => {
    expect(readGrafanaConfig({ GRAFANA_URL: 'https://g.example/', GRAFANA_TOKEN: 't' })).toEqual({
      url: 'https://g.example',
      token: 't',
    })
  })
})
