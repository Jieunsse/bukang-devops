import { ImageResponse } from 'next/og'

import { LogoMark } from '@/shared/ui/LogoMark'

import { SITE_DESCRIPTION, SITE_NAME } from './site'

export const alt = `${SITE_NAME} · ${SITE_DESCRIPTION}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** 기본 글꼴에는 한글이 없어서, 그림에 들어가는 글자만 담은 Noto Sans KR을 Google Fonts에서 받는다. */
async function loadFont(weight: 400 | 700, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((res) => res.text())
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
  if (!url) throw new Error(`Noto Sans KR ${weight} 글꼴 주소를 찾지 못했어요.`)
  return fetch(url).then((res) => res.arrayBuffer())
}

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([
    loadFont(700, SITE_NAME),
    loadFont(400, SITE_DESCRIPTION),
  ])
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 40,
        width: '100%',
        height: '100%',
        padding: '0 96px',
        background: '#f4f4f5',
        fontFamily: 'Noto Sans KR',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <LogoMark size={128} />
        <div style={{ fontSize: 88, fontWeight: 700, color: '#18181b' }}>{SITE_NAME}</div>
      </div>
      <div style={{ fontSize: 44, fontWeight: 400, color: '#52525b' }}>{SITE_DESCRIPTION}</div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Noto Sans KR', data: bold, weight: 700, style: 'normal' },
        { name: 'Noto Sans KR', data: regular, weight: 400, style: 'normal' },
      ],
    },
  )
}
