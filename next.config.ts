import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // GA4 Data API 패키지는 gRPC와 .proto 파일을 경로로 읽어서 번들하지 않고 node_modules에서 그대로 불러온다.
  serverExternalPackages: ['@google-analytics/data'],
  // 검색엔진이 주소를 따라 들어와도 색인하지 않게 모든 응답에 붙인다.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
}

export default nextConfig
