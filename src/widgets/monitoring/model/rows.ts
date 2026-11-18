import type { Sample } from '@/shared/api/grafana/server'

// 프로메테우스 질의 결과를 화면의 상태판·서비스 표 행으로 바꾼다. 서버·테스트 어디서나 쓰는 순수 함수다.

/** 프로메테우스 job 이름 → 화면 이름. 없는 job은 이름 그대로 보인다 */
const JOB_NAMES: Record<string, string> = {
  gateway: '게이트웨이',
  'member-service': '회원',
  'cash-service': '예치금',
  'product-service': '상품',
  'order-service': '주문',
  'payout-service': '정산',
  'queue-service': '대기열',
  'notification-service': '알림',
  'board-service': '게시판',
  'inquiry-service': '문의',
  'file-service': '파일',
  'ai-service': 'AI',
  mysql: 'MySQL',
  redis: 'Redis',
  redpanda: 'Kafka',
  elasticsearch: 'Elasticsearch',
  node: '서버 자원',
  cadvisor: '컨테이너 자원',
  'monitoring-prometheus': '프로메테우스',
}

export const isService = (job: string) => job === 'gateway' || job.endsWith('-service')

export type Target = { job: string; name: string; instance: string; up: boolean }

export type ServiceRow = {
  job: string
  name: string
  up: boolean
  /** 최근 5분 초당 요청 수 */
  rps: number | null
  /** 최근 5분 요청 중 5xx 비율(0~1). 요청이 없으면 null */
  errorRatio: number | null
  /** 최근 5분 응답 시간 95번째 백분위(초) */
  p95Seconds: number | null
  heapBytes: number | null
}

export type MetricSamples = {
  rps: Sample[] | null
  errors: Sample[] | null
  p95: Sample[] | null
  heap: Sample[] | null
}

/** 멈춘 대상을 먼저, 그다음 이름 순 */
export function toTargets(up: Sample[]): Target[] {
  return up
    .map((s) => {
      const job = s.labels.job ?? ''
      return {
        job,
        name: JOB_NAMES[job] ?? job,
        instance: s.labels.instance ?? '',
        up: s.value === 1,
      }
    })
    .sort((a, b) => Number(a.up) - Number(b.up) || a.name.localeCompare(b.name, 'ko'))
}

export function toServiceRows(targets: Target[], m: MetricSamples): ServiceRow[] {
  const byJob = (samples: Sample[] | null) => {
    const map = new Map<string, number>()
    for (const s of samples ?? [])
      if (Number.isFinite(s.value)) map.set(s.labels.job ?? '', s.value)
    return (job: string) => map.get(job) ?? null
  }
  const rps = byJob(m.rps)
  const errors = byJob(m.errors)
  const p95 = byJob(m.p95)
  const heap = byJob(m.heap)

  return targets
    .filter((t) => isService(t.job))
    .map((t) => {
      const r = rps(t.job)
      // 5xx가 한 번도 없으면 시계열 자체가 없다. 요청 수를 받았을 때만 0으로 본다
      const e = errors(t.job) ?? (m.errors && r !== null ? 0 : null)
      return {
        job: t.job,
        name: t.name,
        up: t.up,
        rps: r,
        errorRatio: r && e !== null ? e / r : null,
        p95Seconds: p95(t.job),
        heapBytes: heap(t.job),
      }
    })
}
