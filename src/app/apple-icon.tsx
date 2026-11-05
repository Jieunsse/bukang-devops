import { ImageResponse } from 'next/og'

import { LogoMark } from '@/shared/ui/LogoMark'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// 홈 화면 아이콘은 기기가 모서리를 둥글게 깎으므로 흰 바탕 가운데에 기호를 둔다.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
      }}
    >
      <LogoMark size={140} />
    </div>,
    size,
  )
}
