'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import {
  DEFAULT_SCHEDULE_COLOR,
  SCHEDULE_COLOR_LABEL,
  SCHEDULE_COLORS,
  scheduleInputSchema,
  TITLE_MAX,
  type Schedule,
  type ScheduleInput,
  type WriteRequest,
} from '@/shared/api/schedule'
import { writeScheduleAction } from '@/shared/api/schedule/actions'
import { SCHEDULES_QUERY_KEY } from '@/shared/api/schedule/query'

import { SCHEDULE_COLOR_STYLE } from '../lib/colors'
import { ScheduleRangeField } from './ScheduleRangeField'

/** 일정 추가·수정 창. 고칠 일정이 있으면 수정과 삭제를, 없으면 추가를 한다. 열 때마다 새로 그린다. */
export function ScheduleDialog({
  onClose,
  schedule,
  defaults,
  password,
  onPasswordChange,
}: {
  onClose: () => void
  schedule: Schedule | null
  defaults: Omit<ScheduleInput, 'color'>
  /** 한 번 넣은 팀 비밀번호는 페이지를 떠날 때까지 다시 묻지 않는다. 브라우저 저장소에는 남기지 않는다. */
  password: string
  onPasswordChange: (password: string) => void
}) {
  const queryClient = useQueryClient()
  const { control, handleSubmit } = useForm<ScheduleInput>({
    defaultValues: schedule
      ? { title: schedule.title, start: schedule.start, end: schedule.end, color: schedule.color }
      : { ...defaults, color: DEFAULT_SCHEDULE_COLOR },
    resolver: zodResolver(scheduleInputSchema),
  })
  // 비밀번호 오류만 비밀번호 칸에 붙이고, 나머지 오류는 창 위쪽에 따로 알린다.
  const [error, setError] = useState<{ password: boolean; message: string } | null>(null)
  // 삭제는 되돌릴 수 없어서 한 번 더 눌러야 지운다.
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate, isPending } = useMutation({
    mutationFn: (request: WriteRequest) => writeScheduleAction(password, request),
    onSuccess: (result, request) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY })
        toast.success(DONE_MESSAGE[request.kind])
        onClose()
        return
      }
      if (result.reason === 'missing') {
        void queryClient.invalidateQueries({ queryKey: SCHEDULES_QUERY_KEY })
      }
      setError({ password: result.reason === 'password', message: FAIL_MESSAGE[result.reason] })
    },
    onError: () =>
      setError({ password: false, message: '저장하지 못했어요. 잠시 뒤 다시 해 주세요.' }),
  })

  const save = handleSubmit((input) =>
    mutate(schedule ? { kind: 'update', id: schedule.id, input } : { kind: 'create', input }),
  )

  return (
    // 창 바깥을 눌러도 닫지 않는다. 일정을 두 번 누르면 두 번째 누름이 바깥에 떨어져 창이 바로 닫혀서다.
    // 닫기는 「닫기」 버튼과 Esc 키로 한다. 적던 내용을 실수로 잃지 않는 효과도 있다.
    <Modal.Backdrop isOpen isDismissable={false} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container placement="center">
        <Modal.Dialog aria-label={schedule ? '일정 고치기' : '일정 추가'}>
          <form onSubmit={save} noValidate>
            <Modal.Header>
              <Modal.Heading>{schedule ? '일정 고치기' : '일정 추가'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              {error && !error.password && (
                <p role="alert" className="text-sm text-danger">
                  {error.message}
                </p>
              )}
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
                    maxLength={TITLE_MAX}
                    autoFocus
                  >
                    <Label>제목</Label>
                    <Input placeholder="예: 개발 마감" />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </TextField>
                )}
              />
              <ScheduleRangeField control={control} />
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <span id="schedule-color-label" className="text-sm font-medium">
                      색
                    </span>
                    <ToggleButtonGroup
                      aria-labelledby="schedule-color-label"
                      size="sm"
                      selectionMode="single"
                      disallowEmptySelection
                      selectedKeys={[field.value]}
                      onSelectionChange={(keys) => field.onChange([...keys][0])}
                      className="flex-wrap"
                    >
                      {SCHEDULE_COLORS.map((color) => (
                        <ToggleButton key={color} id={color} className="gap-1.5">
                          <span
                            aria-hidden
                            className={`size-3 rounded-sm ${SCHEDULE_COLOR_STYLE[color].swatch}`}
                          />
                          {SCHEDULE_COLOR_LABEL[color]}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </div>
                )}
              />
              <TextField
                type="password"
                value={password}
                onChange={onPasswordChange}
                isInvalid={!!error?.password}
                validationBehavior="aria"
              >
                <Label>팀 비밀번호</Label>
                <Input autoComplete="current-password" />
                <FieldError>{error?.password && error.message}</FieldError>
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              {schedule && (
                <Button
                  variant="danger-soft"
                  className="mr-auto"
                  isDisabled={isPending}
                  onPress={() =>
                    confirmDelete
                      ? mutate({ kind: 'delete', id: schedule.id })
                      : setConfirmDelete(true)
                  }
                >
                  {confirmDelete ? '한 번 더 누르면 지워요' : '삭제'}
                </Button>
              )}
              <Button variant="secondary" onPress={onClose}>
                닫기
              </Button>
              <Button type="submit" isPending={isPending}>
                저장
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

const DONE_MESSAGE: Record<WriteRequest['kind'], string> = {
  create: '일정을 추가했어요',
  update: '일정을 고쳤어요',
  delete: '일정을 지웠어요',
}

const FAIL_MESSAGE: Record<'password' | 'invalid' | 'missing', string> = {
  password: '비밀번호가 맞지 않아요.',
  invalid: '제목과 날짜를 다시 확인해 주세요.',
  missing: '다른 사람이 이미 지운 일정이에요. 창을 닫으면 새 목록이 보여요.',
}
