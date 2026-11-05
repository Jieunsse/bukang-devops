'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'

import { doneRangeSchema, type DoneRange } from '@/shared/api/linear'

const FIELDS = [
  { name: 'start', label: '시작일' },
  { name: 'end', label: '종료일' },
] as const

export function RangeForm({
  range,
  onSubmit,
}: {
  range: DoneRange
  onSubmit: (range: DoneRange) => void
}) {
  const { control, handleSubmit } = useForm<DoneRange>({
    values: range,
    resolver: zodResolver(doneRangeSchema),
  })

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      aria-label="기간"
      className="flex flex-wrap items-start gap-3"
    >
      {FIELDS.map(({ name, label }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field, fieldState }) => (
            <TextField
              type="date"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isInvalid={fieldState.invalid}
              validationBehavior="aria"
              className="w-44"
            >
              <Label>{label}</Label>
              <Input />
              <FieldError>{fieldState.error?.message}</FieldError>
            </TextField>
          )}
        />
      ))}
      {/* 입력칸 위 이름표 높이만큼 내려 입력칸과 줄을 맞춘다. */}
      <Button type="submit" className="mt-6">
        적용
      </Button>
    </form>
  )
}
