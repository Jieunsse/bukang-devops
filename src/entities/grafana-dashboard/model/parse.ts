// 그라파나 대시보드 JSON을 화면이 쓰는 모양으로 줄인다.
// 새 형식(panels + row 패널)과 옛 형식(rows[].panels)을 모두 읽는다.

export type PanelKind = 'timeseries' | 'stat' | 'table' | 'unsupported'

export type PanelTarget = { refId: string; expr: string; legend: string }

export type Panel = {
  id: number
  title: string
  kind: PanelKind
  /** 그라파나 단위 이름(bytes, percent, s …). 없으면 숫자 그대로 */
  unit: string | null
  decimals: number | null
  targets: PanelTarget[]
}

export type Section = { title: string; panels: Panel[] }

export type VariableQuery =
  | { kind: 'labelValues'; label: string; selector: string | null }
  | { kind: 'metrics'; pattern: string }

export type Variable = {
  name: string
  label: string
  query: VariableQuery
  multi: boolean
  includeAll: boolean
  /** 「전체」를 골랐을 때 넣을 값. 없으면 모든 값을 (a|b) 로 묶는다 */
  allValue: string | null
}

export type Dashboard = { uid: string; title: string; variables: Variable[]; sections: Section[] }

type RawPanel = {
  id?: number
  type?: string
  title?: string
  panels?: RawPanel[]
  collapsed?: boolean
  targets?: { refId?: string; expr?: string; legendFormat?: string; hide?: boolean }[]
  fieldConfig?: { defaults?: { unit?: string; decimals?: number } }
  yaxes?: { format?: string; decimals?: number }[]
  format?: string
  decimals?: number
}

const KIND: Record<string, PanelKind> = {
  timeseries: 'timeseries',
  graph: 'timeseries',
  stat: 'stat',
  singlestat: 'stat',
  gauge: 'stat',
  bargauge: 'stat',
  table: 'table',
}

function toPanel(p: RawPanel): Panel | null {
  // 글 상자(text)처럼 질의가 없는 패널은 뺀다
  const targets = (p.targets ?? [])
    .filter((t) => !t.hide && t.expr?.trim())
    .map((t, i) => ({
      refId: t.refId ?? String.fromCharCode(65 + i),
      expr: t.expr!.trim(),
      legend: t.legendFormat ?? '',
    }))
  if (targets.length === 0 || p.id === undefined) return null
  const unit = p.fieldConfig?.defaults?.unit ?? p.yaxes?.[0]?.format ?? p.format ?? null
  const decimals = p.fieldConfig?.defaults?.decimals ?? p.decimals ?? p.yaxes?.[0]?.decimals ?? null
  return {
    id: p.id,
    title: p.title?.trim() || '이름 없는 그래프',
    kind: KIND[p.type ?? ''] ?? 'unsupported',
    unit: unit && unit !== 'none' ? unit : null,
    decimals: typeof decimals === 'number' ? decimals : null,
    targets,
  }
}

function parseVariableQuery(raw: unknown): VariableQuery | null {
  const q = (typeof raw === 'object' && raw !== null && 'query' in raw ? raw.query : raw) as unknown
  if (typeof q !== 'string') return null
  const text = q.trim()
  const metrics = /^metrics\((.+)\)$/.exec(text)
  if (metrics) return { kind: 'metrics', pattern: metrics[1]!.trim() }
  const labelValues = /^label_values\((?:(.+),\s*)?(\w+)\s*\)$/.exec(text)
  if (labelValues) {
    return { kind: 'labelValues', selector: labelValues[1]?.trim() ?? null, label: labelValues[2]! }
  }
  return null
}

export function parseDashboard(uid: string, json: unknown): Dashboard {
  const d = (json as { dashboard?: Record<string, unknown> }).dashboard ?? {}
  const sections: Section[] = []
  const push = (title: string, raws: RawPanel[]) => {
    const panels = raws.map(toPanel).filter((p): p is Panel => p !== null)
    if (panels.length) sections.push({ title, panels })
  }

  if (Array.isArray(d.rows)) {
    for (const row of d.rows as { title?: string; panels?: RawPanel[] }[]) {
      push(row.title?.trim() || '개요', row.panels ?? [])
    }
  } else {
    // row 패널 아래(접힌 row는 안쪽 panels)에 오는 패널을 그 묶음으로 모은다
    let title = '개요'
    let bucket: RawPanel[] = []
    for (const p of (d.panels as RawPanel[] | undefined) ?? []) {
      if (p.type === 'row') {
        push(title, bucket)
        title = p.title?.trim() || '묶음'
        bucket = [...(p.panels ?? [])]
      } else {
        bucket.push(p)
      }
    }
    push(title, bucket)
  }

  const list = ((d.templating as { list?: unknown[] } | undefined)?.list ?? []) as {
    name?: string
    label?: string
    type?: string
    query?: unknown
    multi?: boolean
    includeAll?: boolean
    allValue?: string | null
  }[]
  const variables: Variable[] = []
  for (const v of list) {
    if (v.type !== 'query' || !v.name) continue
    const query = parseVariableQuery(v.query)
    if (!query) continue
    variables.push({
      name: v.name,
      label: v.label?.trim() || v.name,
      query,
      multi: Boolean(v.multi),
      includeAll: Boolean(v.includeAll),
      allValue: v.allValue || null,
    })
  }

  return { uid, title: typeof d.title === 'string' ? d.title : uid, variables, sections }
}
