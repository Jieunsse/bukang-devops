import { describe, expect, it } from 'vitest'

import { getLinearSource, MissingApiKeyError } from './env'

describe('Linear 데이터 출처', () => {
  it('키가 있으면 Linear에서 받는다', () => {
    expect(getLinearSource({ LINEAR_API_KEY: 'lin_api_x' })).toEqual({
      kind: 'live',
      apiKey: 'lin_api_x',
    })
  })

  it('키가 없으면 개발과 미리보기에서는 예시 데이터를 쓴다', () => {
    expect(getLinearSource({})).toEqual({ kind: 'fixture' })
    expect(getLinearSource({ LINEAR_API_KEY: '', VERCEL_ENV: 'preview' })).toEqual({
      kind: 'fixture',
    })
  })

  it('운영에서 키가 없으면 예시 데이터 대신 오류를 낸다', () => {
    expect(() => getLinearSource({ VERCEL_ENV: 'production' })).toThrow(MissingApiKeyError)
  })
})
