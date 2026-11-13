import { passwordMatches } from '../schedule/password'
import { normalizePem, openSealedReport, type SealedReport } from './crypto'

export type OpenReportResult =
  { ok: true; html: string; url: string } | { ok: false; reason: 'password' | 'missing' | 'failed' }

/** 팀 비밀번호가 맞을 때만 리포트를 풀어 돌려준다. 비밀번호를 먼저 확인해 틀리면 복호화하지 않는다. */
export function openReport(
  sealed: SealedReport | undefined,
  password: unknown,
  env: { SCHEDULE_PASSWORD?: string; REPORTS_PRIVATE_KEY?: string },
): OpenReportResult {
  if (typeof password !== 'string' || !passwordMatches(password, env.SCHEDULE_PASSWORD)) {
    return { ok: false, reason: 'password' }
  }
  if (!sealed || !env.REPORTS_PRIVATE_KEY) return { ok: false, reason: 'missing' }
  try {
    // 암호문 안에는 원본 주소와 HTML을 함께 넣는다. 주소의 공유 키도 비밀번호 없이는 보이면 안 된다.
    const { url, html } = JSON.parse(
      openSealedReport(sealed, normalizePem(env.REPORTS_PRIVATE_KEY)),
    ) as {
      url: string
      html: string
    }
    return { ok: true, html, url }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
