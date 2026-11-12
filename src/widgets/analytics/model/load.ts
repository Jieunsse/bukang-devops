import 'server-only'

import {
  FUNNELS,
  rankFormErrors,
  resolveStatsPeriod,
  seoulToday,
  toTrendStats,
  type FormErrorGroup,
  type FunnelKind,
  type FunnelStepStat,
  type StatsPeriod,
  type StatsPeriodKind,
  type TrendStats,
} from '@/entities/usage-stats'
import { getGa4Reporter, type Ga4Reporter, type RealtimeOverview } from '@/shared/api/ga4/server'

// 크루런 프론트의 어드민 이용 통계(/admin/stats/data)와 같은 GA4 질의를 서버 컴포넌트에서 바로 부른다.
// 영역마다 따로 부르고 따로 실패한다. 실패한 영역은 null이다.

/** 실시간 보고서에서 보여 줄 화면 수 */
const TOP_SCREEN_COUNT = 5

export type AnalyticsData =
  | { status: 'notConfigured' }
  | {
      status: 'ok'
      kind: StatsPeriodKind
      period: StatsPeriod
      realtime: RealtimeOverview | null
      visitors: TrendStats | null
      purchases: TrendStats | null
      buyer: FunnelStepStat[] | null
      seller: FunnelStepStat[] | null
      formErrors: FormErrorGroup[] | null
    }

export async function loadAnalytics(kind: StatsPeriodKind): Promise<AnalyticsData> {
  const ga4 = getGa4Reporter()
  if (ga4.status === 'notConfigured') return { status: 'notConfigured' }
  const period = resolveStatsPeriod(kind, seoulToday())
  if (ga4.status === 'invalid') {
    return emptyResult(kind, period)
  }

  const r = ga4.reporter
  const [realtime, visitors, purchases, buyer, seller, formErrors] = await Promise.all([
    settle('realtime', r.realtime({ topScreens: TOP_SCREEN_COUNT })),
    // 방문자는 구매자 화면 방문만 센다 (판매자 센터 방문은 빼요, 크루런 어드민과 같다)
    settle('visitors', trend(r, period, { metric: 'activeUsers', siteArea: 'shop' })),
    settle('purchases', trend(r, period, { metric: 'totalUsers', eventName: 'purchase' })),
    settle('buyer', funnel(r, 'buyer', period)),
    settle('seller', funnel(r, 'seller', period)),
    settle('formErrors', formErrorRanking(r, period)),
  ])
  return { status: 'ok', kind, period, realtime, visitors, purchases, buyer, seller, formErrors }
}

function emptyResult(kind: StatsPeriodKind, period: StatsPeriod): AnalyticsData {
  return {
    status: 'ok',
    kind,
    period,
    realtime: null,
    visitors: null,
    purchases: null,
    buyer: null,
    seller: null,
    formErrors: null,
  }
}

async function settle<T>(name: string, promise: Promise<T>): Promise<T | null> {
  try {
    return await promise
  } catch (e) {
    // 키는 오류에 들어 있지 않지만, 혹시 몰라 오류 문구만 남긴다
    console.error(`[ga4] ${name} 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`)
    return null
  }
}

function ranges(period: StatsPeriod) {
  return [
    { name: 'current', startDate: period.current.start, endDate: period.current.end },
    { name: 'previous', startDate: period.previous.start, endDate: period.previous.end },
  ]
}

async function trend(
  reporter: Ga4Reporter,
  period: StatsPeriod,
  filter: { metric: 'activeUsers' | 'totalUsers'; siteArea?: string; eventName?: string },
): Promise<TrendStats> {
  return toTrendStats(period, await reporter.usersByDate({ ...filter, dateRanges: ranges(period) }))
}

async function funnel(
  reporter: Ga4Reporter,
  kind: FunnelKind,
  period: StatsPeriod,
): Promise<FunnelStepStat[]> {
  const { siteArea, steps } = FUNNELS[kind]
  const users = await reporter.usersByEvent({
    events: steps.map((step) => step.event),
    siteArea,
    dateRanges: ranges(period),
  })
  return steps.map((step) => ({
    ...step,
    users: users.current?.[step.event] ?? 0,
    previousUsers: users.previous?.[step.event] ?? 0,
  }))
}

/** 판매자 대회 등록 입력 오류 묶음 순위. 고른 기간만 센다 */
async function formErrorRanking(
  reporter: Ga4Reporter,
  period: StatsPeriod,
): Promise<FormErrorGroup[]> {
  const rows = await reporter.usersByDimension({
    eventName: 'seller_race_form_error',
    dimension: 'customEvent:error_sections',
    dateRange: { name: 'current', startDate: period.current.start, endDate: period.current.end },
  })
  return rankFormErrors(rows)
}
