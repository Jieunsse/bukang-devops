const FONT_PX = 12
/** px-2.5 양쪽 20px과 글자 상자 양쪽 2px */
const CHIP_PADDING_PX = 24
const CELL_PADDING_PX = 32
/** 칸 제목 「마일스톤」과 「마일스톤 없음」 칩이 들어가는 폭 */
const MIN_PX = 128

/** 마일스톤 칸이 넓어져도 제목 칸에 남겨 둘 폭 */
export const TITLE_MIN_PX = 240

const charEm = (code: number) => (code > 0xffff ? 1.2 : code >= 0x2e80 ? 0.9 : 0.7)

/**
 * 가장 긴 마일스톤 이름이 칩 한 줄에 다 들어가는 칸 폭(px).
 * 표가 묶음마다 따로라서 칸을 맞추려고 같은 폭을 계산해 나눠 쓴다.
 */
// shortcut: 글자 폭을 넉넉히 어림한다(한글·한자 0.9em, 이모지 1.2em, 그 밖 0.7em). 글꼴을 바꾸면 다시 잰다.
export function milestoneColumnWidth(names: string[]): number {
  const em = Math.max(
    0,
    ...[...names, '마일스톤 없음'].map((name) =>
      [...name].reduce((sum, ch) => sum + charEm(ch.codePointAt(0) ?? 0), 0),
    ),
  )
  return Math.max(MIN_PX, Math.ceil(em * FONT_PX + CHIP_PADDING_PX + CELL_PADDING_PX))
}
