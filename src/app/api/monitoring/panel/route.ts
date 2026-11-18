import { NextResponse, type NextRequest } from 'next/server'

import { readGrafanaConfig } from '@/shared/api/grafana/server'
import {
  findPanel,
  loadDashboard,
  queryPanel,
  resolveVariables,
} from '@/widgets/grafana-dashboard/model/server'
import { parseRange, selectedFromParams } from '@/widgets/grafana-dashboard/model/types'

// 패널 하나의 시계열. 브라우저는 대시보드 uid·패널 번호·변수 값·기간만 보낸다.
// 질의문은 서버가 대시보드 설정에서 꺼내므로, 이 주소로 아무 PromQL이나 실행할 수 없다.
export async function GET(req: NextRequest) {
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  if (!config) return NextResponse.json({ error: '그라파나 연결 정보가 없어요' }, { status: 503 })

  const sp = req.nextUrl.searchParams
  const uid = sp.get('uid') ?? ''
  const panelId = Number(sp.get('panel'))
  if (!/^[\w-]{1,64}$/.test(uid) || !Number.isInteger(panelId)) {
    return NextResponse.json({ error: '잘못된 요청이에요' }, { status: 400 })
  }
  const params: Record<string, string[]> = {}
  for (const key of new Set(sp.keys())) params[key] = sp.getAll(key)
  const range = parseRange(sp.get('range'))

  try {
    const dashboard = await loadDashboard(config, uid)
    const panel = findPanel(dashboard, panelId)
    if (!panel) return NextResponse.json({ error: '패널이 없어요' }, { status: 404 })
    const { values } = await resolveVariables(config, dashboard, selectedFromParams(params), range)
    return NextResponse.json(await queryPanel(config, panel, values, range), {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (e) {
    console.error(`[grafana] 패널 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`)
    return NextResponse.json({ error: '그라파나에서 받지 못했어요' }, { status: 502 })
  }
}
