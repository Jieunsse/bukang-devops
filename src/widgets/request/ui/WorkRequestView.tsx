'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Calendar,
  Card,
  DateField,
  DatePicker,
  FieldError,
  I18nProvider,
  Input,
  Label,
  TextArea,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm, type Control } from 'react-hook-form'

import { MemberAvatar } from '@/entities/member'
import type { Member } from '@/shared/api/linear'
import { useSnapshot } from '@/shared/api/linear/query'
import {
  REQUEST_DESCRIPTION_MAX,
  REQUEST_TITLE_MAX,
  workRequestInputSchema,
  type WorkRequestInput,
} from '@/shared/api/request'
import { createWorkRequestAction } from '@/shared/api/request/actions'

const EMPTY: WorkRequestInput = {
  assigneeId: '',
  requesterId: '',
  title: '',
  description: '',
  dueDate: '',
}

const FAIL_MESSAGE = {
  password: '비밀번호가 맞지 않아요.',
  invalid: '팀원과 제목을 다시 확인해 주세요.',
  failed: 'Linear에 티켓을 만들지 못했어요. 잠시 뒤 다시 해 주세요.',
} as const

/** 팀원을 골라 Linear BUK 팀에 티켓을 만든다. 팀 비밀번호는 페이지를 떠날 때까지만 기억한다. */
export function WorkRequestView() {
  const members = useSnapshot().members ?? []
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ password: boolean; message: string } | null>(null)
  const { control, handleSubmit, reset, getValues } = useForm<WorkRequestInput>({
    defaultValues: EMPTY,
    resolver: zodResolver(workRequestInputSchema),
  })
  const { mutate, isPending } = useMutation({
    mutationFn: (input: WorkRequestInput) => createWorkRequestAction(password, input),
    onSuccess: (result) => {
      if (!result.ok) {
        setError({ password: result.reason === 'password', message: FAIL_MESSAGE[result.reason] })
        return
      }
      setError(null)
      toast.success(`${result.identifier} 티켓을 만들었어요`, {
        actionProps: { children: 'Linear에서 보기', onPress: () => window.open(result.url) },
      })
      // 같은 사람이 이어서 요청하는 일이 많아 요청하는 사람은 남긴다.
      reset({ ...EMPTY, requesterId: getValues('requesterId') })
    },
    onError: () => setError({ password: false, message: FAIL_MESSAGE.failed }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">작업 요청</h2>
        <p className="text-sm text-muted">
          팀원을 고르면 그 사람이 담당자인 Linear 티켓이 BUK 팀에 만들어져요.
        </p>
      </div>
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit((input) => mutate(input))} noValidate>
          <Card.Content className="flex flex-col gap-5">
            {error && !error.password && (
              <p role="alert" className="text-sm text-danger">
                {error.message}
              </p>
            )}
            <MemberField control={control} name="assigneeId" label="누구에게" members={members} />
            <MemberField
              control={control}
              name="requesterId"
              label="요청하는 사람"
              members={members}
            />
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isInvalid={fieldState.invalid}
                  validationBehavior="aria"
                  maxLength={REQUEST_TITLE_MAX}
                >
                  <Label>제목</Label>
                  <Input placeholder="예: 로그인 화면 문구 고치기" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isInvalid={fieldState.invalid}
                  validationBehavior="aria"
                  maxLength={REQUEST_DESCRIPTION_MAX}
                >
                  <Label>설명 (선택)</Label>
                  <TextArea rows={5} placeholder="무엇을, 왜 해야 하는지 적어 주세요." />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </TextField>
              )}
            />
            <DueDateField control={control} />
            <TextField
              type="password"
              value={password}
              onChange={setPassword}
              isInvalid={!!error?.password}
              validationBehavior="aria"
              className="max-w-xs"
            >
              <Label>팀 비밀번호</Label>
              <Input autoComplete="current-password" />
              <FieldError>{error?.password && error.message}</FieldError>
            </TextField>
          </Card.Content>
          <Card.Footer className="justify-end">
            <Button type="submit" isPending={isPending}>
              요청 보내기
            </Button>
          </Card.Footer>
        </form>
      </Card>
    </div>
  )
}

function MemberField({
  control,
  name,
  label,
  members,
}: {
  control: Control<WorkRequestInput>
  name: 'assigneeId' | 'requesterId'
  label: string
  members: Member[]
}) {
  const labelId = `${name}-label`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <span id={labelId} className="text-sm font-medium">
            {label}
          </span>
          <ToggleButtonGroup
            aria-labelledby={labelId}
            size="sm"
            selectionMode="single"
            selectedKeys={field.value ? [field.value] : []}
            onSelectionChange={(keys) => field.onChange([...keys][0] ?? '')}
            className="flex-wrap justify-start"
          >
            {members.map((m) => (
              <ToggleButton key={m.id} id={m.id} className="gap-1.5">
                <MemberAvatar name={m.name} avatarUrl={m.avatarUrl} small />
                {m.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {fieldState.error && (
            <p role="alert" className="text-sm text-danger">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  )
}

const toDate = (s: string) => {
  try {
    return parseDate(s)
  } catch {
    return null
  }
}

/** 기한은 고르지 않아도 된다. 날짜는 시간대 없는 'YYYY-MM-DD'라서 한국 시간 그대로다. */
function DueDateField({ control }: { control: Control<WorkRequestInput> }) {
  return (
    <Controller
      control={control}
      name="dueDate"
      render={({ field, fieldState }) => (
        <I18nProvider locale="ko-KR">
          <DatePicker
            value={toDate(field.value)}
            onChange={(date) => field.onChange(date?.toString() ?? '')}
            onBlur={field.onBlur}
            isInvalid={fieldState.invalid}
            validationBehavior="aria"
            className="max-w-xs"
          >
            <Label>기한 (선택)</Label>
            <DateField.Group>
              <DateField.Input>
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DatePicker.Trigger aria-label="달력에서 고르기">
                  <DatePicker.TriggerIndicator />
                </DatePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>
            <FieldError>{fieldState.error?.message}</FieldError>
            <DatePicker.Popover>
              <Calendar aria-label="기한 고르기">
                <Calendar.Header>
                  <Calendar.Heading />
                  <Calendar.NavButton slot="previous" />
                  <Calendar.NavButton slot="next" />
                </Calendar.Header>
                <Calendar.Grid>
                  <Calendar.GridHeader>
                    {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
            </DatePicker.Popover>
          </DatePicker>
        </I18nProvider>
      )}
    />
  )
}
