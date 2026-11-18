'use client'

import { Label, ListBox, Select } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  ALL,
  panelLabel,
  sectionLabel,
  type Dashboard,
  type Panel,
} from '@/entities/grafana-dashboard'
import { report as s, ReportHeader } from '@/shared/ui'

import type { DashboardLink } from '../model/dashboards'
import { RANGES, type RangeKey, type VariableState } from '../model/types'
import { MonitoringTabs } from './MonitoringTabs'
import { ChartCard, SpecItem, StatCard } from './PanelCard'

// 그라파나 대시보드 하나를 그대로 옮긴 화면. 묶음(row)은 제목으로만 나누고(왼쪽 목차 없음), 패널은 그래프와 표로 보여 준다.
// 변수와 기간을 바꾸면 주소가 바뀌고, 서버가 그 값으로 변수 목록을 다시 푼다.

export type DashboardViewData = {
  dashboard: Dashboard
  name: string
  links: DashboardLink[]
  variables: VariableState[]
  range: RangeKey
}

/** 패널 요청에 붙일 검색값. 고른 변수 값과 기간 */
function panelQuery(variables: VariableState[], range: RangeKey) {
  const p = new URLSearchParams({ range })
  for (const v of variables) for (const value of v.selected) p.append(`v.${v.name}`, value)
  return p.toString()
}

export function DashboardView({ data }: { data: DashboardViewData }) {
  const router = useRouter()
  const { dashboard, variables, range } = data
  const sections = dashboard.sections.map((sec, i) => ({ ...sec, key: `s${i}` }))
  const query = panelQuery(variables, range)

  const choose = (name: string, value: string) => {
    const next = variables.map((v) => (v.name === name ? { ...v, selected: [value] } : v))
    router.push(`/monitoring/${dashboard.uid}?${panelQuery(next, range)}`)
  }

  return (
    <div className={`${s.report} ${s.solo}`}>
      <div className={`${s.page} ${s.wide}`}>
        <MonitoringTabs links={data.links} current={dashboard.uid} />
        <ReportHeader
          title={data.name}
          sub={`그라파나 「${dashboard.title}」 · 1분마다 갱신 · 빨간 글자는 그라파나 기준값을 넘은 값`}
          actions={
            <nav aria-label="기간" className={s.seg}>
              {(Object.keys(RANGES) as RangeKey[]).map((r) => (
                <Link
                  key={r}
                  href={`/monitoring/${dashboard.uid}?${panelQuery(variables, r)}`}
                  aria-current={r === range ? 'page' : undefined}
                >
                  {RANGES[r].label}
                </Link>
              ))}
            </nav>
          }
        />

        {variables.length > 0 && (
          <div role="group" aria-label="대상 고르기" className="flex flex-wrap gap-3">
            {variables.map((v) => (
              <Select
                key={v.name}
                className="w-56"
                value={v.selected[0] ?? null}
                onChange={(value) => value !== null && choose(v.name, String(value))}
              >
                <Label>{v.label}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {v.includeAll ? (
                      <ListBox.Item id={ALL} textValue="전체">
                        전체
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ) : null}
                    {v.options.map((o) => (
                      <ListBox.Item key={o} id={o} textValue={o}>
                        {o}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ))}
          </div>
        )}

        {sections.map((sec) => (
          <section
            key={sec.key}
            id={`dash-${sec.key}`}
            aria-label={sec.title}
            className="scroll-mt-4"
          >
            <h3 className={`${s.h2} flex items-baseline gap-2`}>
              {sectionLabel(sec.title).name}
              {sectionLabel(sec.title).original && (
                <small className="text-sm font-normal text-muted">
                  {sectionLabel(sec.title).original}
                </small>
              )}
            </h3>
            <SectionPanels uid={dashboard.uid} panels={sec.panels} query={query} />
          </section>
        ))}
      </div>
    </div>
  )
}

/**
 * 묶음 하나의 패널 배치. 사양 값은 맨 위 한 줄, 숫자 패널은 작은 카드 격자(너비에 따라 한 줄 4~6장, 폰은 2장),
 * 그래프 패널은 넓은 화면에서 한 줄 2~3개가 들어가는 격자로 나눈다.
 */
function SectionPanels({ uid, panels, query }: { uid: string; panels: Panel[]; query: string }) {
  const specs = panels.filter((p) => panelLabel(p).spec)
  const stats = panels.filter((p) => !panelLabel(p).spec && p.kind === 'stat')
  const charts = panels.filter((p) => !panelLabel(p).spec && p.kind !== 'stat')
  return (
    <div className="flex flex-col gap-3">
      {specs.length > 0 && (
        <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted" aria-label="사양">
          <span className="font-medium text-foreground">사양</span>
          {specs.map((p) => (
            <SpecItem key={p.id} uid={uid} panel={p} query={query} />
          ))}
        </p>
      )}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {stats.map((p) => (
            <StatCard key={p.id} uid={uid} panel={p} query={query} />
          ))}
        </div>
      )}
      {charts.length > 0 && (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(min(100%,480px),1fr))] gap-3">
          {charts.map((p) => (
            <ChartCard key={p.id} uid={uid} panel={p} query={query} />
          ))}
        </div>
      )}
    </div>
  )
}
