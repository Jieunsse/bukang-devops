'use server'

import kafka from '../../../../reports/kafka.enc.json'
import overall from '../../../../reports/overall.enc.json'
import transaction from '../../../../reports/transaction.enc.json'
import { openReport } from './service'

// 암호문은 서버 번들에만 들어간다. 브라우저에는 비밀번호가 맞을 때 푼 HTML만 내려간다.
const SEALED: Record<string, typeof overall> = { overall, transaction, kafka }

export async function openReportAction(slug: string, password: unknown) {
  const { SCHEDULE_PASSWORD, REPORTS_PRIVATE_KEY } = process.env
  return openReport(SEALED[slug], password, { SCHEDULE_PASSWORD, REPORTS_PRIVATE_KEY })
}
