import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { getConfig } from '@/lib/config'

// 确保配置已加载
getConfig()

export const metadata = {
  title: '语音转文字平台',
  description: '一个优雅、现代的语音转文字平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        <div className="flex h-screen">
          <Sidebar />
          {children}
        </div>
      </body>
    </html>
  )
}
