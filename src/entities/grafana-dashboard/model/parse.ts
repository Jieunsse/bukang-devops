// 그라파나 대시보드 JSON을 화면이 쓰는 모양으로 줄인다.
// 새 형식(panels + row 패널)과 옛 형식(rows[].panels)을 모두 읽는다.

export type PanelKind = 'timeseries' | 'stat' | 'table' | 'unsupported'

export type PanelTarget = { refId: string; expr: string; legend: string }

/** 그라파나 기준값 한 칸. value 이상이면 이 단계다(null은 가장 아래) */
export type ThresholdLevel = 'ok' | 'warn' | 'bad'
export type ThresholdStep = { value: number | null; level: ThresholdLevel }

export type Panel = {
  id: number
  /** 그라파나 원래 제목. 없으면 빈 문자열 */
  title: string
  /** 그라파나 패널 설명(영어). 없으면 빈 문자열 */
  description: string
  /** 그라파나 대시보드가 정한 기준값. 없으면 빈 배열 */
  steps: ThresholdStep[]
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
  description?: string
  fieldConfig?: {
    defaults?: {
      unit?: string
      decimals?: number
      thresholds?: { steps?: { color?: string; value?: number | null }[] }
      color?: { mode?: string }
      custom?: { thresholdsStyle?: { mode?: string } }
    }
  }
  options?: { colorMode?: string }
  /** 옛 singlestat 기준값 "70,90" 과 그 세 칸의 색 */
  thresholds?: unknown
  colors?: string[]
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
    title: p.title?.trim() ?? '',
    description: p.description?.trim() ?? '',
    steps: thresholdSteps(p),
    kind: KIND[p.type ?? ''] ?? 'unsupported',
    unit: unit && unit !== 'none' ? unit : null,
    decimals: typeof decimals === 'number' ? decimals : null,
    targets,
  }
}

/** 색 이름·hex·rgba를 단계로 바꾼다. 빨강 계열은 bad, 주황·노랑 계열은 warn */
export function colorLevel(color: string | undefined): ThresholdLevel {
  const c = (color ?? '').toLowerCase()
  if (c.includes('red')) return 'bad'
  if (c.includes('orange') || c.includes('yellow')) return 'warn'
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c)
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/.exec(c)
  const [r, g, b] = rgb
    ? rgb.slice(1, 4).map(Number)
    : hex
      ? hex.slice(1, 4).map((h) => parseInt(h, 16))
      : [0, 0, 0]
  if (r! > 180 && g! < 110) return 'bad'
  if (r! > 180 && b! < 120) return 'warn'
  return 'ok'
}

/** 그라파나 화면에서 기준값이 실제로 쓰이는지. 새 패널에 자동으로 들어간 [초록, 빨강 80]을 걸러 낸다 */
function usesThresholds(p: RawPanel): boolean {
  const d = p.fieldConfig?.defaults
  if (p.type === 'timeseries' || p.type === 'graph') {
    const style = d?.custom?.thresholdsStyle?.mode
    return d?.color?.mode === 'thresholds' || (style !== undefined && style !== 'off')
  }
  if (p.type === 'stat') return p.options?.colorMode !== 'none'
  return true
}

function thresholdSteps(p: RawPanel): ThresholdStep[] {
  const steps = p.fieldConfig?.defaults?.thresholds?.steps
  if (steps?.length) {
    if (!usesThresholds(p)) return []
    return steps.map((st) => ({ value: st.value ?? null, level: colorLevel(st.color) }))
  }
  // 옛 형식: "a,b" 와 색 세 개(a 미만, a 이상, b 이상)
  if (typeof p.thresholds === 'string' && p.thresholds.trim() && p.colors?.length === 3) {
    const [a, b] = p.thresholds.split(',').map((x) => Number(x.trim()))
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return [
        { value: null, level: colorLevel(p.colors[0]) },
        { value: a!, level: colorLevel(p.colors[1]) },
        { value: b!, level: colorLevel(p.colors[2]) },
      ]
    }
  }
  return []
}

/** 값이 속한 기준 단계. 기준이 없으면 ok */
export function levelOf(steps: ThresholdStep[], v: number): ThresholdLevel {
  let level: ThresholdLevel = 'ok'
  for (const st of steps) if (st.value === null || v >= st.value) level = st.level
  return level
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
