import { z } from 'zod'

import { seriesStats } from '@/shared/lib/chart'

import type { MonitoringData } from './load'
import { isService } from './rows'
import { issuesOf, verdictOf, type Issue } from './verdict'

// AI 모니터링 해석. 숫자와 판정은 여기서 계산해 작은 JSON으로 만들고, AI는 그 결과로 문장 세 줄만 쓴다.
// 그래서 AI가 틀려도 화면 숫자는 맞다.

type Ok = Extract<MonitoringData, { status: 'ok' }>

const ISSUE_TEXT: Record<Issue, string> = {
  down: '응답 없음',
  errors: '서버 오류 비율 1% 초과',
  slow: '응답 시간(95%) 1초 초과',
}

const round = (v: number | null, digits = 1) =>
  v === null ? null : Math.round(v * 10 ** digits) / 10 ** digits
const ms = (sec: number | null) => (sec === null ? null : Math.round(sec * 1000))

export function buildExplainInput(data: Ok) {
  const verdict = verdictOf(data.services, data.targets)
  return {
    problems: verdict.problemServices,
    totalErrorRatioPercent: round(
      verdict.totalErrorRatio === null ? null : verdict.totalErrorRatio * 100,
      2,
    ),
    infraDown: data.targets.filter((t) => !isService(t.job) && !t.up).map((t) => t.name),
    services: data.services.map((r) => ({
      name: r.name,
      status: r.up ? '정상' : '응답 없음',
      requestsPerSecond: round(r.rps, 2),
      errorRatioPercent: round(r.errorRatio === null ? null : r.errorRatio * 100, 2),
      p95Ms: ms(r.p95Seconds),
      heapMb: r.heapBytes === null ? null : Math.round(r.heapBytes / 1024 / 1024),
      issues: issuesOf(r).map((i) => ISSUE_TEXT[i]),
    })),
    // 최근 1시간 응답 시간 추이는 처음·마지막·최대만 보낸다
    p95Trend: (data.trends.p95 ?? []).map((t) => {
      const values = t.points.filter(([, v]) => v !== null)
      const st = seriesStats(t.points)
      return {
        name: t.name,
        firstMs: ms(values[0]?.[1] ?? null),
        lastMs: ms(st.latest),
        maxMs: ms(st.max),
      }
    }),
  }
}

export const ExplanationSchema = z.object({
  status: z.string().min(1).max(200),
  cause: z.string().min(1).max(200),
  firstCheck: z.string().min(1).max(200),
})
export type ExplanationText = z.infer<typeof ExplanationSchema>

export const EXPLAIN_SYSTEM = `당신은 운영 서버 모니터링 결과를 팀원에게 설명합니다.
사용자 메시지의 JSON은 코드가 계산한 최근 5분 지표와 판정입니다.

세 칸을 각각 한 문장으로 씁니다.
- status: 지금 상태. problems가 비어 있으면 모두 정상이라고 씁니다.
- cause: 문제가 있다면 의심되는 원인. 없으면 눈여겨볼 점을 씁니다.
- firstCheck: 먼저 확인할 곳(서비스 이름과 지표).

규칙
- 받은 숫자만 근거로 씁니다. 숫자를 새로 만들거나 바꾸지 않습니다.
- 값이 null이면 「데이터 없음」이라고 씁니다.
- 판정(problems, issues)을 바꾸지 않습니다.
- 처음 보는 사람이 다시 해석하지 않아도 되게 씁니다.
- 상태값 영어나 코드 이름 대신 뜻으로 씁니다.
- 한 문장에 한 가지만 말하고, 「무엇이 → 그래서 어떻게 되는지」까지 씁니다.
- 비유, 줄표, 조각 문장은 쓰지 않습니다.
- 해요체로 씁니다.`
