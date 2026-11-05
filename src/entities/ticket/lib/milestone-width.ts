const FONT_PX = 12
const CHIP_PADDING_PX = 20
const CELL_PADDING_PX = 32
/** 칸 제목 「마일스톤」과 「마일스톤 없음」 칩이 들어가는 폭 */
const MIN_PX = 128

/**
 * 가장 긴 마일스톤 이름이 칩 한 줄에 다 들어가는 칸 폭(px).
 * 표가 묶음마다 따로라서 칸을 맞추려고 같은 폭을 계산해 나눠 쓴다.
 */
// shortcut: 글자 폭을 한글 0.9em, 그 밖 0.6em으로 넉넉히 어림한다. 글꼴을 바꾸면 다시 잰다.
export function milestoneColumnWidth(names: string[]): number {
  const em = Math.max(
    0,
    ...[...names, '마일스톤 없음'].map((name) =>
      [...name].reduce((sum, ch) => sum + (/[ㄱ-힣]/.test(ch) ? 0.9 : 0.6), 0),
    ),
  )
  return Math.max(MIN_PX, Math.ceil(em * FONT_PX + CHIP_PADDING_PX + CELL_PADDING_PX))
}
