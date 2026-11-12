import { parseStatsPeriodKind } from '@/entities/usage-stats'
import { AnalyticsView } from '@/widgets/analytics'
import { loadAnalytics } from '@/widgets/analytics/model/load'

// GA4 서비스 계정 키는 서버에서만 쓰고, 브라우저에는 사람 수만 내려 준다.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { period } = await searchParams
  return <AnalyticsView data={await loadAnalytics(parseStatsPeriodKind(period))} />
}
