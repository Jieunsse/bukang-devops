'use client'

import { Xmark } from '@gravity-ui/icons'
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
  ListBox,
  Select,
  Separator,
  Spinner,
  TextArea,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'

import { MemberAvatar } from '@/entities/member'
import { PriorityIcon } from '@/entities/ticket'
import { useSnapshot } from '@/shared/api/linear/query'
import {
  NO_CYCLE,
  PRIORITY_LABEL,
  REQUEST_DESCRIPTION_MAX,
  REQUEST_TITLE_MAX,
  workRequestInputSchema,
  type RequestOptions,
  type WorkRequestInput,
} from '@/shared/api/request'
import { createWorkRequestAction, loadRequestOptionsAction } from '@/shared/api/request/actions'
import { addDays, formatDayWithWeekday, formatMonthDay, kstDate } from '@/shared/lib/date'

import { RequestLog, REQUEST_LOG_KEY } from './RequestLog'

const FAIL_MESSAGE = {
  password: '비밀번호가 맞지 않아요.',
  invalid: '고른 값을 다시 확인해 주세요. 그새 Linear에서 바뀌었다면 페이지를 새로 열어 주세요.',
  failed: 'Linear에 티켓을 만들지 못했어요. 잠시 뒤 다시 해 주세요.',
} as const

// 마일스톤 없음은 폼 값이 빈 문자열이다. 토글 버튼 id에는 빈 문자열을 쓸 수 없어서 따로 둔다.
const NO_MILESTONE_KEY = 'no-milestone'

/** 프로젝트가 하나뿐이면 미리 골라 둔다. 나머지 분류는 요청하는 사람이 직접 고른다. */
function emptyInput(options: RequestOptions, requesterId = ''): WorkRequestInput {
  return {
    assigneeId: '',
    requesterId,
    title: '',
    description: '',
    dueDate: '',
    projectId: options.projects.length === 1 ? options.projects[0]!.id : '',
    milestoneId: '',
    labelIds: [],
    priority: 0,
    cycleId: '',
  }
}

// 사이클 끝 시각은 다음 날 0시(한국 시간)라서 하루 빼서 보여 준다.
const cycleText = (c: RequestOptions['cycles'][number]) =>
  `사이클 ${c.number}${c.name ? ` ${c.name}` : ''} · ${formatMonthDay(kstDate(c.startsAt))}~${formatMonthDay(addDays(kstDate(c.endsAt), -1))}`

/** 팀원을 골라 Linear BUK 팀에 티켓을 만든다. 고를 라벨·프로젝트·사이클을 먼저 받는다. */
export function WorkRequestView() {
  const options = useQuery({
    queryKey: ['request-options'],
    queryFn: () => loadRequestOptionsAction(),
  })
  return (
    // data-narrow: AppShell이 머리 영역과 이 카드를 같은 폭으로 묶어 가운데에 둔다.
    <div data-narrow className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">작업 요청</h2>
        <p className="text-sm text-muted">
          팀원을 고르면 그 사람이 담당자인 Linear 티켓이 BUK 팀에 만들어져요. 받는 사람이 다시
          채우지 않게 분류까지 정해서 보내 주세요.
        </p>
      </div>
      {options.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner aria-label="고를 값을 받는 중" />
        </div>
      ) : options.isError ? (
        <p role="alert" className="text-sm text-danger">
          Linear에서 라벨·프로젝트·사이클을 받지 못했어요. 잠시 뒤 다시 열어 주세요.
        </p>
      ) : (
        <WorkRequestForm options={options.data} />
      )}
      <RequestLog />
    </div>
  )
}

function WorkRequestForm({ options }: { options: RequestOptions }) {
  const members = useSnapshot().members ?? []
  const queryClient = useQueryClient()
  // 한 번 넣은 팀 비밀번호는 페이지를 떠날 때까지 다시 묻지 않는다. 브라우저 저장소에는 남기지 않는다.
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ password: boolean; message: string } | null>(null)
  const { control, handleSubmit, reset, getValues, setValue } = useForm<WorkRequestInput>({
    defaultValues: emptyInput(options),
    resolver: zodResolver(workRequestInputSchema),
  })
  const projectId = useWatch({ control, name: 'projectId' })
  const milestones = options.projects.find((p) => p.id === projectId)?.milestones ?? []
  const { mutate, isPending } = useMutation({
    mutationFn: (input: WorkRequestInput) => createWorkRequestAction(password, input),
    onSuccess: (result) => {
      if (!result.ok) {
        setError({ password: result.reason === 'password', message: FAIL_MESSAGE[result.reason] })
        return
      }
      setError(null)
      void queryClient.invalidateQueries({ queryKey: REQUEST_LOG_KEY })
      toast.success(`${result.identifier} 티켓을 만들었어요`, {
        actionProps: { children: 'Linear에서 보기', onPress: () => window.open(result.url) },
      })
      // 같은 사람이 이어서 요청하는 일이 많아 요청하는 사람은 남긴다.
      reset(emptyInput(options, getValues('requesterId')))
    },
    onError: () => setError({ password: false, message: FAIL_MESSAGE.failed }),
  })

  const memberChoices = members.map((m) => ({
    id: m.id,
    content: (
      <>
        <MemberAvatar name={m.name} avatarUrl={m.avatarUrl} small />
        {m.name}
      </>
    ),
  }))

  const project = options.projects.find((p) => p.id === projectId)

  return (
    <Card>
      <form onSubmit={handleSubmit((input) => mutate(input))} noValidate>
        <Card.Content className="flex flex-col gap-6">
          {error && !error.password && (
            <p role="alert" className="text-sm text-danger">
              {error.message}
            </p>
          )}
          {/* 넓은 화면(1024px 이상)에서는 왼쪽에 사람·내용, 오른쪽에 분류를 둔다. 좁으면 한 단으로 쌓는다. */}
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col gap-6">
              <FormSection title="사람">
                <ChoiceController
                  control={control}
                  name="assigneeId"
                  label="누구에게"
                  choices={memberChoices}
                />
                <ChoiceController
                  control={control}
                  name="requesterId"
                  label="요청하는 사람"
                  choices={memberChoices}
                />
              </FormSection>
              <Separator />
              {/* 설명칸이 왼쪽 단의 남은 높이를 채워 두 단 높이가 맞는다. */}
              <FormSection title="내용" className="flex-1">
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
                      className="flex flex-1 flex-col"
                    >
                      <Label>설명 (선택)</Label>
                      <TextArea
                        rows={4}
                        placeholder="무엇을, 왜 해야 하는지 적어 주세요."
                        // 설명칸 높이는 두 단 높이에 맞춰 정해지므로 손으로 늘이지 못하게 막는다.
                        className="flex-1 resize-none"
                      />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </TextField>
                  )}
                />
              </FormSection>
            </div>
            <Separator className="lg:hidden" />
            <div className="flex flex-col gap-6 lg:border-l lg:border-separator lg:pl-8">
              <FormSection title="분류">
                {/* 분류는 한 줄에 하나씩 세로로 늘어놓는다. 칸 폭은 모두 그 단을 채운다. */}
                <div className="flex flex-col gap-5">
                  <Controller
                    control={control}
                    name="projectId"
                    render={({ field, fieldState }) =>
                      // 고를 프로젝트가 하나뿐이면 미리 골라 둔 값을 글자로만 보여 준다.
                      options.projects.length === 1 ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-medium">프로젝트</span>
                          <span className="flex h-9 items-center text-sm">{project?.name}</span>
                        </div>
                      ) : (
                        <SelectField
                          label="프로젝트"
                          placeholder="프로젝트 고르기"
                          items={options.projects}
                          value={field.value}
                          onChange={(id) => {
                            field.onChange(id)
                            // 다른 프로젝트의 마일스톤은 붙일 수 없어서 비운다.
                            setValue('milestoneId', '')
                          }}
                          error={fieldState.error?.message}
                        />
                      )
                    }
                  />
                  <Controller
                    control={control}
                    name="milestoneId"
                    render={({ field }) => (
                      <SelectField
                        label="마일스톤"
                        items={[{ id: NO_MILESTONE_KEY, name: '마일스톤 없음' }, ...milestones]}
                        value={field.value || NO_MILESTONE_KEY}
                        onChange={(id) => field.onChange(id === NO_MILESTONE_KEY ? '' : id)}
                        isDisabled={!project}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field, fieldState }) => (
                      <ChoiceField
                        label="우선순위"
                        choices={([1, 2, 3, 4] as const).map((p) => ({
                          id: String(p),
                          content: (
                            <>
                              <PriorityIcon priority={p} />
                              {PRIORITY_LABEL[p]}
                            </>
                          ),
                        }))}
                        selected={field.value ? [String(field.value)] : []}
                        onChange={([id]) => field.onChange(Number(id ?? 0))}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="cycleId"
                    render={({ field, fieldState }) => (
                      <ChoiceField
                        label="사이클"
                        choices={[
                          ...options.cycles.map((c) => ({ id: c.id, content: cycleText(c) })),
                          { id: NO_CYCLE, content: '사이클 없음' },
                        ]}
                        selected={field.value ? [field.value] : []}
                        onChange={([id = '']) => field.onChange(id)}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="labelIds"
                    render={({ field, fieldState }) => (
                      <ChoiceField
                        label="라벨 (여러 개 고를 수 있어요)"
                        multiple
                        choices={options.labels.map((l) => ({
                          id: l.id,
                          // 일정 색 고르기처럼 Linear 라벨 색 견본과 이름을 함께 쓴다.
                          content: (
                            <>
                              <span
                                aria-hidden
                                className="size-3 rounded-sm"
                                style={{ backgroundColor: l.color }}
                              />
                              {l.name}
                            </>
                          ),
                        }))}
                        selected={field.value}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                  <DueDateField control={control} />
                </div>
              </FormSection>
            </div>
          </div>
        </Card.Content>
        {/* 비밀번호는 보내기 직전에 넣는 값이라 보내기 버튼과 한 줄로 묶는다. */}
        <Card.Footer className="mt-2 flex flex-col items-stretch gap-3 border-t border-separator pt-4 sm:flex-row sm:items-start">
          <TextField
            type="password"
            value={password}
            onChange={setPassword}
            isInvalid={!!error?.password}
            validationBehavior="aria"
            aria-label="팀 비밀번호"
            className="sm:flex-1"
          >
            <Input autoComplete="current-password" placeholder="팀 비밀번호" />
            <FieldError>{error?.password && error.message}</FieldError>
          </TextField>
          <Button type="submit" isPending={isPending} className="w-full sm:w-auto">
            요청 보내기
          </Button>
        </Card.Footer>
      </form>
    </Card>
  )
}

/** 관련 있는 칸끼리 묶는 작은 제목 영역 */
function FormSection({
  title,
  className = '',
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className={`flex flex-col gap-5 ${className}`}>
      <h3 id={titleId} className="text-sm font-semibold text-muted">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** 보기가 많아 버튼으로 늘어놓으면 줄이 넘치는 칸. 펼쳐 보는 선택 상자로 고른다. */
function SelectField({
  label,
  placeholder,
  items,
  value,
  onChange,
  isDisabled,
  error,
}: {
  label: string
  placeholder?: string
  items: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  isDisabled?: boolean
  error?: string
}) {
  return (
    <Select
      value={value || null}
      onChange={(v) => onChange(String(v ?? ''))}
      isDisabled={isDisabled}
      isInvalid={!!error}
      placeholder={placeholder}
      className="w-full"
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <FieldError>{error}</FieldError>
      <Select.Popover>
        <ListBox>
          {items.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.name}>
              {o.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

type Choice = { id: string; content: ReactNode }

/** 팀원 고르기. 한 명만 고른다. */
function ChoiceController({
  control,
  name,
  label,
  choices,
}: {
  control: Control<WorkRequestInput>
  name: 'assigneeId' | 'requesterId'
  label: string
  choices: Choice[]
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <ChoiceField
          label={label}
          choices={choices}
          selected={field.value ? [field.value] : []}
          onChange={([id = '']) => field.onChange(id)}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}

/** 보기를 버튼으로 늘어놓고 고르는 칸. 보기가 몇 개 안 돼서 펼친 채로 둔다. */
function ChoiceField({
  label,
  choices,
  selected,
  onChange,
  multiple,
  error,
}: {
  label: string
  choices: Choice[]
  selected: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  error?: string
}) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <ToggleButtonGroup
        aria-labelledby={labelId}
        size="sm"
        selectionMode={multiple ? 'multiple' : 'single'}
        selectedKeys={selected}
        onSelectionChange={(keys) => onChange([...keys].map(String))}
        // 붙은 모양은 줄이 넘어가면 바탕이 계단처럼 깨져서 버튼을 떨어뜨려 놓는다.
        isDetached
        className="flex-wrap justify-start gap-1.5"
      >
        {choices.map((c) => (
          <ToggleButton key={c.id} id={c.id} className="gap-1.5">
            {c.content}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

const toDate = (s: string) => {
  try {
    return parseDate(s)
  } catch {
    return null
  }
}

/** '2026-11-09' → '2026년 11/9(월)' */
const dueText = (date: string) => `${date.slice(0, 4)}년 ${formatDayWithWeekday(date)}`

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
            className="w-full"
          >
            <Label>기한 (선택)</Label>
            {/* 날짜는 달력에서만 고른다. 칸 전체가 달력을 여는 버튼이고, 고른 날짜는 글자로만 보여 준다. */}
            <DateField.Group>
              <DatePicker.Trigger className="h-full w-full flex-1 justify-start rounded-none bg-transparent px-3 text-left text-sm font-normal">
                {field.value ? (
                  dueText(field.value)
                ) : (
                  <span className="text-field-placeholder">달력에서 날짜 고르기</span>
                )}
              </DatePicker.Trigger>
              {field.value && (
                // DatePicker 안의 버튼은 모두 달력 열기로 묶여서, 지우기는 HeroUI Button 대신 기본 버튼으로 둔다.
                <button
                  type="button"
                  aria-label="기한 지우기"
                  onClick={() => field.onChange('')}
                  className="mr-2 flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-default"
                >
                  <Xmark aria-hidden />
                </button>
              )}
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
