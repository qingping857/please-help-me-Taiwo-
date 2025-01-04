'use client'

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { useState } from "react"

interface HistoryItem {
  id: string
  title: string
  date: string
}

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [histories] = useState<HistoryItem[]>([])

  return (
    <>
      {/* 移动端菜单按钮 */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <nav className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">历史记录</h2>
            {histories.length === 0 ? (
              <p className="text-muted-foreground">暂无历史记录</p>
            ) : (
              histories.map((history) => (
                <Button
                  key={history.id}
                  variant="ghost"
                  className="justify-start"
                >
                  <div className="flex flex-col items-start">
                    <span>{history.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {history.date}
                    </span>
                  </div>
                </Button>
              ))
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex h-full w-[300px] flex-col gap-4 border-r p-4">
        <h2 className="text-lg font-semibold">历史记录</h2>
        {histories.length === 0 ? (
          <p className="text-muted-foreground">暂无历史记录</p>
        ) : (
          histories.map((history) => (
            <Button
              key={history.id}
              variant="ghost"
              className="justify-start"
            >
              <div className="flex flex-col items-start">
                <span>{history.title}</span>
                <span className="text-xs text-muted-foreground">
                  {history.date}
                </span>
              </div>
            </Button>
          ))
        )}
      </div>
    </>
  )
} 