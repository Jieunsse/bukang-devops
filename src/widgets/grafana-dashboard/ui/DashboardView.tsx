'use client'

import { Label, ListBox, Select } from '@heroui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ALL, sectionLabel, type Dashboard } from '@/entities/grafana-dashboard'
import { report as s, ReportHeader } from '@/shared/ui'

import type { DashboardLink } from '../model/dashboards'
import { RANGES, type RangeKey, type VariableState } from '../model/types'
import { MonitoringTabs } from './MonitoringTabs'
import { PanelCard } from './PanelCard'

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
      <div className={s.page}>
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
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sec.panels.map((p) => (
                <PanelCard key={p.id} uid={dashboard.uid} panel={p} query={query} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
