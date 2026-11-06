'use client'

import {
  DateField,
  DateRangePicker,
  FieldError,
  I18nProvider,
  Label,
  RangeCalendar,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useController, type Control } from 'react-hook-form'

import type { ScheduleInput } from '@/shared/api/schedule'

const toDate = (s: string) => {
  try {
    return parseDate(s)
  } catch {
    return null
  }
}

/**
 * 시작일·종료일을 한 칸에서 고르는 기간 입력. 브라우저 기본 날짜 창 대신 HeroUI 달력을 한국어로 띄운다.
 * 날짜는 시간대 없는 'YYYY-MM-DD'라서 한국 시간 그대로다. 값 검사는 폼의 Zod 규칙을 따른다.
 */
export function ScheduleRangeField({ control }: { control: Control<ScheduleInput> }) {
  const start = useController({ control, name: 'start' })
  const end = useController({ control, name: 'end' })
  const startDate = toDate(start.field.value)
  const endDate = toDate(end.field.value)
  const error = start.fieldState.error?.message ?? end.fieldState.error?.message

  return (
    <I18nProvider locale="ko-KR">
      <DateRangePicker
        value={startDate && endDate ? { start: startDate, end: endDate } : null}
        onChange={(range) => {
          start.field.onChange(range?.start.toString() ?? '')
          end.field.onChange(range?.end.toString() ?? '')
        }}
        onBlur={() => {
          start.field.onBlur()
          end.field.onBlur()
        }}
        isInvalid={!!error}
        validationBehavior="aria"
        startName="start"
        endName="end"
      >
        <Label>기간</Label>
        <DateField.Group>
          <DateField.InputContainer>
            <DateField.Input slot="start" aria-label="시작일">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end" aria-label="종료일">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.InputContainer>
          <DateField.Suffix>
            <DateRangePicker.Trigger aria-label="달력에서 고르기">
              <DateRangePicker.TriggerIndicator />
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <FieldError>{error}</FieldError>
        <DateRangePicker.Popover>
          <RangeCalendar aria-label="기간 고르기">
            <RangeCalendar.Header>
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {(date) => <RangeCalendar.Cell date={date} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>
    </I18nProvider>
  )
}
