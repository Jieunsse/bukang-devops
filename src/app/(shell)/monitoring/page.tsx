import { connection } from 'next/server'
import { Suspense } from 'react'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'
import { MonitoringView } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'
import { ExplainPanel } from '@/widgets/monitoring/ui/ExplainPanel'

// 그라파나 토큰과 Claude 키는 서버에서만 쓰고, 브라우저에는 계산한 지표와 해석 문장만 내려 준다.
// 지표 질의는 1분 동안 캐시하고, AI 해석은 새로고침 전까지 서버 캐시를 쓴다.
export default async function MonitoringPage() {
  // 요청마다 그려서 AI 해석을 Suspense로 늦게 채운다(빌드 때 AI를 부르지 않는다)
  await connection()
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  // 대시보드 목록을 못 받아도 요약은 보여 준다
  const links = config
    ? await listDashboards(config)
        .then(toDashboardLinks)
        .catch(() => [])
    : []
  return (
    <MonitoringView
      data={await loadMonitoring()}
      tabs={links.length ? <MonitoringTabs links={links} current={null} /> : undefined}
      explain={
        <Suspense fallback={<p className="text-sm text-muted">AI 해석을 불러오는 중이에요</p>}>
          <ExplainPanel />
        </Suspense>
      }
    />
  )
}
