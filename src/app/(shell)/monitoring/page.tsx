import { connection } from 'next/server'
import { Suspense } from 'react'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { report as s, ReportHeader } from '@/shared/ui'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'
import { MonitoringView } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'
import { ExplainPanel } from '@/widgets/monitoring/ui/ExplainPanel'

// 요약 탭: 첫 화면에 AI 리포트만 보여 준다. 나머지 지표는 「상세 지표」 탭에 있다.
// 그라파나 토큰과 Claude 키는 서버에서만 쓰고, 브라우저에는 계산한 지표와 리포트 문구만 내려 준다.
// AI 리포트를 처음 만들 때와 새로고침(서버 액션) 때 최대 60초 걸릴 수 있다
export const maxDuration = 90

export default async function MonitoringPage() {
  // 요청마다 그려서 AI 리포트를 Suspense로 늦게 채운다(빌드 때 AI를 부르지 않는다)
  await connection()
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  const links = config
    ? await listDashboards(config)
        .then(toDashboardLinks)
        .catch(() => [])
    : []
  const data = await loadMonitoring()
  const tabs = links.length ? <MonitoringTabs links={links} current={null} /> : undefined
  // 지표를 못 받으면 리포트도 만들지 않는다(실패가 리포트 캐시에 남지 않게)
  if (data.status !== 'ok') return <MonitoringView data={data} tabs={tabs} />
  return (
    <div className={`${s.report} ${s.solo}`}>
      <div className={`${s.page} ${s.wide}`}>
        {tabs}
        <ReportHeader title="모니터링 리포트" />
        <Suspense fallback={<p className="text-sm text-muted">리포트를 만드는 중이에요</p>}>
          <ExplainPanel data={data} links={links} />
        </Suspense>
      </div>
    </div>
  )
}
