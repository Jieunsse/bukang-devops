/**
 * 숫자 카드 격자의 열 수. 빈칸 없이 줄이 꽉 차도록 n을 나누어떨어지게 하는 가장 큰 열 수를 고른다.
 * 그래도 남으면 마지막 카드가 남은 칸을 차지한다(spanLast).
 */
export function gridOf(n: number, max: number) {
  const cols =
    n <= max
      ? n
      : (Array.from({ length: max - 1 }, (_, i) => max - i).find((c) => n % c === 0) ?? max)
  const rest = n % cols
  return { cols, spanLast: rest === 0 ? 1 : cols - rest + 1 }
}
