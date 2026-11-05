'use client'

import { Sliders } from '@gravity-ui/icons'
import { Button, Label, ListBox, Popover, Select } from '@heroui/react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useSnapshot } from '@/shared/api/linear/query'

import { FILTER_KEYS, type FilterKey, type Filters } from '../lib/filter'
import { filterOptions } from '../lib/options'
import { useFilters } from '../lib/use-filters'

const FIELD_LABEL: Record<FilterKey, string> = {
  assignee: '담당자',
  label: '라벨',
  milestone: '마일스톤',
}
const ALL = '__all'

type FormValues = Record<FilterKey, string>

const toForm = (filters: Filters): FormValues => ({
  assignee: filters.assignee ?? ALL,
  label: filters.label ?? ALL,
  milestone: filters.milestone ?? ALL,
})
const fromForm = (values: FormValues): Filters =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ALL))

export function FilterButton() {
  const { issues } = useSnapshot()
  const { filters, setFilters } = useFilters()
  const [isOpen, setOpen] = useState(false)
  const options = useMemo(() => filterOptions(issues), [issues])
  const { control, handleSubmit } = useForm<FormValues>({ values: toForm(filters) })
  const count = Object.keys(filters).length

  const apply = handleSubmit((values) => {
    setFilters(fromForm(values))
    setOpen(false)
  })

  return (
    <Popover isOpen={isOpen} onOpenChange={setOpen}>
      <Button variant="primary">
        <Sliders aria-hidden className="size-4" />
        {count > 0 ? `필터 ${count}` : '필터'}
      </Button>
      <Popover.Content placement="bottom end" className="w-72">
        <Popover.Dialog>
          <form onSubmit={apply} className="flex flex-col gap-3">
            {FILTER_KEYS.map((key) => (
              <Controller
                key={key}
                control={control}
                name={key}
                render={({ field }) => (
                  <Select value={field.value} onChange={(v) => field.onChange(String(v))}>
                    <Label>{FIELD_LABEL[key]}</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id={ALL} textValue="전체">
                          전체
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {options[key].map((o) => (
                          <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
                            {o.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
              />
            ))}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onPress={() => {
                  setFilters({})
                  setOpen(false)
                }}
              >
                모두 지우기
              </Button>
              <Button type="submit">적용</Button>
            </div>
          </form>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}
