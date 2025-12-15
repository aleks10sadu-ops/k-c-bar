import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Оптимизация для Vercel
  poweredByHeader: false,
  
  // Разрешаем изображения из Telegram
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 't.me',
      },
      {
        protocol: 'https',
        hostname: '*.telegram.org',
      },
    ],
  },
  
  // Заголовки для Telegram Mini App
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  },
}

export default nextConfig
