import { describe, expect, it } from 'vitest'

import { getLinearSource, MissingApiKeyError } from './env'

describe('Linear 데이터 출처', () => {
  it('BUK 키만 있으면 BUK 워크스페이스 하나만 받는다', () => {
    expect(getLinearSource({ LINEAR_API_KEY: 'lin_api_x' })).toEqual({
      kind: 'live',
      workspaces: [{ apiKey: 'lin_api_x', teamKey: 'BUK' }],
    })
  })

  it('CRU 키도 있으면 BUK 다음에 CRU 워크스페이스를 받는다', () => {
    expect(
      getLinearSource({ LINEAR_API_KEY: 'lin_api_buk', LINEAR_API_KEY_CRU: 'lin_api_cru' }),
    ).toEqual({
      kind: 'live',
      workspaces: [
        { apiKey: 'lin_api_buk', teamKey: 'BUK' },
        { apiKey: 'lin_api_cru', teamKey: 'CRU' },
      ],
    })
  })

  it('CRU 키가 비어 있으면 오류 없이 BUK만 받는다', () => {
    expect(
      getLinearSource({ LINEAR_API_KEY: 'k', LINEAR_API_KEY_CRU: '', VERCEL_ENV: 'production' }),
    ).toEqual({ kind: 'live', workspaces: [{ apiKey: 'k', teamKey: 'BUK' }] })
  })

  it('키가 없으면 개발과 미리보기에서는 예시 데이터를 쓴다', () => {
    expect(getLinearSource({})).toEqual({ kind: 'fixture' })
    expect(getLinearSource({ LINEAR_API_KEY: '', VERCEL_ENV: 'preview' })).toEqual({
      kind: 'fixture',
    })
  })

  it('BUK 키 없이 CRU 키만 있으면 지금처럼 미리보기는 예시 데이터, 운영은 오류다', () => {
    expect(getLinearSource({ LINEAR_API_KEY_CRU: 'c', VERCEL_ENV: 'preview' })).toEqual({
      kind: 'fixture',
    })
    expect(() =>
      getLinearSource({ LINEAR_API_KEY_CRU: 'c', VERCEL_ENV: 'production' }),
    ).toThrow(MissingApiKeyError)
  })

  it('운영에서 키가 없으면 예시 데이터 대신 오류를 낸다', () => {
    expect(() => getLinearSource({ VERCEL_ENV: 'production' })).toThrow(MissingApiKeyError)
  })
})
