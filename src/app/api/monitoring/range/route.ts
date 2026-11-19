import { NextResponse, type NextRequest } from 'next/server'

import { readGrafanaConfig } from '@/shared/api/grafana/server'
import { cacheSecondsOf, parseRange } from '@/shared/lib/time-range'
import { loadRanged } from '@/widgets/monitoring/model/load'

// 고른 기간의 추이·병목 그래프. 브라우저는 기간 이름만 보내고, 질의문은 서버에 있다.
export async function GET(req: NextRequest) {
  const config = readGrafanaConfig(process.env as Record<string, string | undefined>)
  if (!config) return NextResponse.json({ error: '그라파나 연결 정보가 없어요' }, { status: 503 })
  const range = parseRange(req.nextUrl.searchParams.get('range'))
  return NextResponse.json(await loadRanged(config, range), {
    headers: { 'Cache-Control': `private, max-age=${cacheSecondsOf(range)}` },
  })
}
