import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { sealReport } from './crypto'
import { openReport } from './service'

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})
const html = '<h1>8기 채점</h1>'
const url = 'https://claude.ai/artifact/abc?sk=share-key'
const sealed = sealReport(JSON.stringify({ url, html }), publicKey)
const env = { SCHEDULE_PASSWORD: 'team-secret', REPORTS_PRIVATE_KEY: privateKey }

describe('리포트 열기', () => {
  it('비밀번호가 맞으면 원래 HTML과 원본 주소를 돌려준다', () => {
    expect(openReport(sealed, 'team-secret', env)).toEqual({ ok: true, html, url })
  })

  it('암호문에는 원래 내용이 보이지 않는다', () => {
    expect(JSON.stringify(sealed)).not.toContain('채점')
    expect(JSON.stringify(sealed)).not.toContain('share-key')
  })

  it('비밀번호가 틀리거나 없으면 내용을 주지 않는다', () => {
    expect(openReport(sealed, 'wrong', env)).toEqual({ ok: false, reason: 'password' })
    expect(openReport(sealed, undefined, env)).toEqual({ ok: false, reason: 'password' })
    expect(openReport(sealed, '', { ...env, SCHEDULE_PASSWORD: '' })).toEqual({
      ok: false,
      reason: 'password',
    })
  })

  it('개인키가 없으면 비밀번호가 맞아도 없음으로 답한다', () => {
    expect(openReport(sealed, 'team-secret', { SCHEDULE_PASSWORD: 'team-secret' })).toEqual({
      ok: false,
      reason: 'missing',
    })
  })

  it('한 줄로 넣은 개인키(\\n 글자)도 읽는다', () => {
    const oneLine = { ...env, REPORTS_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n') }
    expect(openReport(sealed, 'team-secret', oneLine)).toEqual({ ok: true, html, url })
  })

  it('암호문이 바뀌었으면 실패로 답한다', () => {
    const broken = { ...sealed, data: Buffer.from('x').toString('base64') }
    expect(openReport(broken, 'team-secret', env)).toEqual({ ok: false, reason: 'failed' })
  })
})
