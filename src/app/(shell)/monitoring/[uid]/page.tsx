import { notFound } from 'next/navigation'

import { listDashboards, readGrafanaConfig } from '@/shared/api/grafana/server'
import { toDashboardLinks } from '@/widgets/grafana-dashboard/model/dashboards'
import { loadDashboard, resolveVariables } from '@/widgets/grafana-dashboard/model/server'
import { parseRange, selectedFromParams } from '@/widgets/grafana-dashboard/model/types'
import { DashboardView } from '@/widgets/grafana-dashboard/ui/DashboardView'
import { MonitoringView } from '@/widgets/monitoring'

// 그라파나 대시보드 하나. 설정과 변수 목록은 서버에서 읽고, 패널 값은 화면이 보일 때 따로 받는다.
export default async function GrafanaDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  if (!config) return <MonitoringView data={{ status: 'notConfigured' }} />
  const { uid } = await params
  if (!/^[\w-]{1,64}$/.test(uid)) notFound()
  const sp = await searchParams
  const range = parseRange(sp.range)

  let dashboard
  let links
  try {
    ;[dashboard, links] = await Promise.all([
      loadDashboard(config, uid),
      listDashboards(config).then(toDashboardLinks),
    ])
  } catch {
    return <MonitoringView data={{ status: 'failed' }} />
  }
  const link = links.find((l) => l.uid === uid)
  if (!link) notFound()
  const { states } = await resolveVariables(config, dashboard, selectedFromParams(sp), range)

  return <DashboardView data={{ dashboard, name: link.name, links, variables: states, range }} />
}
