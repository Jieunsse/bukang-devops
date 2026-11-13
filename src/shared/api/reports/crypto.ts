import {
  constants,
  createCipheriv,
  createDecipheriv,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'node:crypto'

/** 공개 저장소에 커밋하는 리포트 암호문. 본문은 AES-256-GCM, 그 키는 RSA-OAEP로 감싼다. */
export type SealedReport = { key: string; iv: string; tag: string; data: string }

const OAEP = { padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }

export function sealReport(html: string, publicKeyPem: string): SealedReport {
  const key = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(html, 'utf8'), cipher.final()])
  return {
    key: publicEncrypt({ key: publicKeyPem, ...OAEP }, key).toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  }
}

export function openSealedReport(sealed: SealedReport, privateKeyPem: string): string {
  const key = privateDecrypt({ key: privateKeyPem, ...OAEP }, Buffer.from(sealed.key, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(sealed.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.data, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * 환경변수에 붙여 넣은 개인키를 PEM 모양으로 되돌린다.
 * 따옴표가 붙거나, 줄바꿈이 \n 글자·공백으로 바뀌거나, 본문만 들어와도 읽히게 본문 글자만 남겨 다시 만든다.
 */
export function normalizePem(raw: string): string {
  const body = raw
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) [A-Z ]*PRIVATE KEY-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '')
  const lines = body.match(/.{1,64}/g) ?? []
  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`
}
