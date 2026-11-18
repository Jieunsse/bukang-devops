import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { MonitoringView } from '@/widgets/monitoring'
import { loadMonitoring } from '@/widgets/monitoring/model/load'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { MonitoringTabs } from '@/widgets/grafana-dashboard/ui/MonitoringTabs'

// 그라파나 토큰은 서버에서만 쓰고, 브라우저에는 계산한 지표만 내려 준다. 1분마다 다시 받는다.
export const revalidate = 60

export default async function MonitoringPage() {
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
    />
  )
}
