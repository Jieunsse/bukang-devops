import { z } from 'zod'

import { BRIEF_FORMAT, mbText, msText, percentText, rpsText } from './format'
import { BRIEF_SUFFIX, summarizeSeries, THRESHOLDS } from './brief'
import type { MonitoringData } from './load'
import { isService } from './rows'
import { issuesOf, verdictOf, type Issue } from './verdict'

// AI 모니터링 리포트. 숫자와 판정은 코드가 계산하고, 화면에 보이는 표기 그대로의 문자열로 보낸다.
// 자동 브리핑과 같은 계산 결과(카드 문장·시계열 요약)를 넘기므로 화면 숫자와 리포트 숫자가 같다.

type Ok = Extract<MonitoringData, { status: 'ok' }>

const ISSUE_TEXT: Record<Issue, string> = {
  down: '응답 없음',
  errors: '서버 오류 비율 1% 초과',
  slow: '응답 시간(95%) 1초 초과',
}

const pct = (v: number) => `${Math.round(v * 100)}%`

export function buildExplainInput(data: Ok) {
  const verdict = verdictOf(data.services, data.targets)
  return {
    verdict: {
      problems: verdict.problemServices,
      totalErrorRatio: percentText(verdict.totalErrorRatio),
      slowest: verdict.slowest
        ? `${verdict.slowest.name} ${msText(verdict.slowest.p95Seconds)}`
        : '-',
      downCount: `${verdict.downCount}곳`,
      infraDown: data.targets.filter((t) => !isService(t.job) && !t.up).map((t) => t.name),
    },
    thresholds: {
      errorRatio: pct(THRESHOLDS.errorRatio),
      latency: `${THRESHOLDS.latencySeconds}초`,
      cpu: pct(THRESHOLDS.cpu),
      dbConn: pct(THRESHOLDS.dbConnRatio),
      pending: `${THRESHOLDS.pending}건`,
      lock: `초당 ${THRESHOLDS.lockPerSecond}회`,
      memory: pct(THRESHOLDS.memory),
      disk: pct(THRESHOLDS.disk),
      swap: pct(THRESHOLDS.swap),
    },
    // 자동 브리핑 카드: 문장과 시계열 요약(처음·지금·최대·최대 시각). 최근 1시간
    brief: data.brief.map((c) => ({
      title: c.title,
      caption: c.caption,
      alert: c.alert,
      series: c.series.map((s) => summarizeSeries(s, BRIEF_FORMAT[c.unit], BRIEF_SUFFIX[c.key])),
    })),
    // 서비스별 지표 표. 최근 5분
    services: data.services.map((r) => ({
      name: r.name,
      status: r.up ? '정상' : '응답 없음',
      requestsPerSecond: rpsText(r.rps),
      errorRatio: percentText(r.errorRatio),
      p95: msText(r.p95Seconds),
      heap: mbText(r.heapBytes),
      issues: issuesOf(r).map((i) => ISSUE_TEXT[i]),
    })),
    // 서버 자원 사용률. 지금 값
    resources: data.resources.map((r) => ({
      server: r.name,
      memory: percentText(r.memory),
      disk: percentText(r.disk),
      swap: percentText(r.swap),
    })),
  }
}

const line = z.string().min(1)

/** AI가 고를 수 있는 지표. 브리핑 카드 여섯 개와 서버 자원 세 개 */
export const WATCH_METRICS = [
  'throughput',
  'cpu',
  'latency',
  'dbConn',
  'pending',
  'lock',
  'memory',
  'disk',
  'swap',
] as const
export const REPORT_TABS = ['서버', 'JVM', 'MySQL', 'Elasticsearch', '부하 테스트'] as const

/**
 * AI는 짧은 조각만 쓴다. 숫자·그래프·자원 막대·서비스 줄은 코드가 브리핑 데이터로 만든다(model/report.ts).
 * API는 개수·길이 제한을 강제하지 않아서, 스키마는 모양만 검사하고 개수는 화면에서 자른다(REPORT_LIMITS).
 */
export const ExplanationSchema = z.object({
  summary: line,
  watch: z.array(
    z.object({ metric: z.enum(WATCH_METRICS), target: line, title: line, note: line }),
  ),
  causes: z.array(z.object({ label: line, verdict: z.enum(['아님', '의심']), evidence: line })),
  nextSteps: z.array(z.object({ tab: z.enum(REPORT_TABS), action: line })),
})

/** 화면에 보여 줄 최대 개수 */
export const REPORT_LIMITS = { watch: 3, causes: 3, nextSteps: 3 } as const
export type ExplanationText = z.infer<typeof ExplanationSchema>

export const EXPLAIN_SYSTEM = `당신은 운영 서버 모니터링 리포트의 짧은 문구를 씁니다. 숫자와 그래프는 화면이 따로 보여 주므로, 문장은 아주 짧게 씁니다.
사용자 메시지의 JSON은 코드가 계산한 값입니다. brief는 최근 1시간, services는 최근 5분, resources는 지금 값입니다.

칸마다 이렇게 씁니다.
- summary: 한 문장, 40자 이내. 지금 가장 중요한 한 가지.
- watch: 눈여겨볼 지표 최대 3개. metric은 brief 카드(throughput, cpu, latency, dbConn, pending, lock) 또는 resources(memory, disk, swap) 중 하나. target은 brief 시계열 이름이나 resources 서버 이름(예: 주문, 앱 서버). title은 15자 이내(예: 주문 응답 시간). note는 25자 이내로 그래서 무슨 일이 생기는지.
- causes: 원인 점검 최대 3개. label은 15자 이내(예: DB 연결·락), verdict는 아님 또는 의심, evidence는 근거 지표와 값 20자 이내(예: 대기 0건). 근거가 없으면 「근거 없음」.
- nextSteps: 다음에 할 일 최대 3개. tab은 서버, JVM, MySQL, Elasticsearch, 부하 테스트 중 하나. action은 25자 이내.

규칙
- 받은 문자열 숫자만 그대로 씁니다. 새로 계산하거나 단위를 바꾸지 않습니다.
- 판정(verdict, issues)을 바꾸지 않습니다.
- 상태값 영어나 코드 이름, JSON 키 이름을 문장에 쓰지 않습니다(metric 칸은 예외).
- 비유, 줄표, 화살표 같은 기호는 쓰지 않습니다.
- 해요체로 씁니다. 짧은 칸(title, label, evidence)은 명사로 끝내도 됩니다.`
