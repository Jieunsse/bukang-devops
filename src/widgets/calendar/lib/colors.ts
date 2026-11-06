import type { ScheduleColor } from '@/shared/api/schedule'

/**
 * 일정 막대와 색 견본. 바탕은 옅게(밝은 화면 15%, 어두운 화면 35%), 왼쪽 띠는 진하게 칠하고
 * 글자는 늘 기본 글자색을 쓴다. 어두운 화면은 바탕이 짙어서 색을 더 진하게 섞어야 막대가 보인다.
 * 그래서 밝은 화면과 어두운 화면 모두 글자 대비는 바탕 대비와 거의 같고, 띠로 색을 알아본다.
 * 파랑·초록은 HeroUI 테마 색, 보라·청록은 HeroUI 테마에 없어서 Tailwind 기본 색을 쓴다.
 */
export const SCHEDULE_COLOR_STYLE: Record<ScheduleColor, { bar: string; swatch: string }> = {
  blue: { bar: 'bg-accent/15 dark:bg-accent/35 border-accent', swatch: 'bg-accent' },
  green: { bar: 'bg-success/15 dark:bg-success/35 border-success', swatch: 'bg-success' },
  violet: {
    bar: 'bg-violet-500/15 dark:bg-violet-500/35 border-violet-500',
    swatch: 'bg-violet-500',
  },
  teal: { bar: 'bg-teal-500/15 dark:bg-teal-500/35 border-teal-500', swatch: 'bg-teal-500' },
  gray: { bar: 'bg-foreground/10 dark:bg-foreground/20 border-muted', swatch: 'bg-muted' },
}
