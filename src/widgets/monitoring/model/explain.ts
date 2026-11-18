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

/**
 * 리포트 여섯 칸. API는 개수·길이 제한을 강제하지 않아서, 스키마에서 막으면 리포트 전체가 실패한다.
 * 그래서 스키마는 모양만 검사하고, 개수는 프롬프트로 부탁하고 화면에서 자른다(REPORT_LIMITS).
 */
export const ExplanationSchema = z.object({
  summary: line,
  watch: z.array(z.object({ what: line, when: line, howMuch: line, impact: line })),
  causes: z.array(z.object({ guess: line, evidence: line })),
  services: z.array(line),
  resources: z.array(line),
  nextSteps: z.array(z.object({ tab: line, action: line })),
})

/** 화면에 보여 줄 최대 개수 */
export const REPORT_LIMITS = {
  watch: 3,
  causes: 3,
  services: 12,
  resources: 8,
  nextSteps: 3,
} as const
export type ExplanationText = z.infer<typeof ExplanationSchema>

export const EXPLAIN_SYSTEM = `당신은 운영 서버 모니터링 결과를 팀원에게 보고하는 리포트를 씁니다.
사용자 메시지의 JSON은 코드가 계산한 값입니다. brief는 최근 1시간, services는 최근 5분, resources는 지금 값입니다.
thresholds는 문제로 보는 기준입니다.

칸마다 이렇게 씁니다.
- summary: 두세 문장. 판정과 지금 가장 중요한 한 가지.
- watch: 눈여겨볼 것 최대 3개. what(무엇이), when(언제), howMuch(얼마나), impact(그래서 어떤 일이 생기는지).
- causes: 원인 추정 최대 3개. guess에 추정을, evidence에 근거가 된 지표 이름과 값을 씁니다. 근거 지표가 없으면 evidence에 「근거 지표 없음」이라고 씁니다.
- services: 문제가 있거나 변화가 큰 서비스만 한 줄씩. 모두 평소와 같으면 「특이 사항 없음」 한 줄만.
- resources: 서버마다 한 줄, 그리고 DB 연결 한 줄. CPU, 메모리, 디스크, DB 연결이 기준까지 얼마나 남았는지 씁니다. 예: 앱 서버 메모리 80.4%로 기준 90%까지 여유가 있어요.
- nextSteps: 다음에 할 일 최대 3개. tab에는 서버, JVM, MySQL, Elasticsearch, 부하 테스트 중 볼 탭을, action에는 무엇을 볼지 씁니다.

규칙
- 받은 문자열 숫자만 그대로 씁니다. 새로 계산하거나 단위를 바꾸지 않습니다(예: 「1.1초」를 「1100ms」로 바꾸지 않습니다).
- 값이 「-」이거나 없으면 「데이터 없음」이라고 씁니다.
- 판정(verdict, issues)을 바꾸지 않습니다.
- 처음 보는 사람이 다시 해석하지 않아도 되게 씁니다.
- 상태값 영어나 코드 이름 대신 뜻으로 씁니다. JSON 키 이름을 문장에 쓰지 않습니다.
- 한 문장에 한 가지만 말하고, 무엇이 그래서 어떻게 되는지까지 씁니다.
- 비유, 줄표, 화살표 같은 기호, 조각 문장은 쓰지 않습니다.
- 해요체로 씁니다.`
