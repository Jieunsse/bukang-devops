import type { DashboardLink } from '@/widgets/grafana-dashboard/model/dashboards'

import { getExplanation } from '../model/explain-server'
import type { MonitoringData } from '../model/load'
import { ExplainView } from './ExplainView'

/** 서버에서 캐시된 리포트를 읽는다. Suspense 안에 두어 리포트 머리가 먼저 보이게 한다 */
export async function ExplainPanel({
  data,
  links,
}: {
  data: Extract<MonitoringData, { status: 'ok' }>
  links: DashboardLink[]
}) {
  return <ExplainView result={await getExplanation()} data={data} links={links} />
}
