'use client'

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Plus, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { type HistoryItem, getHistories, deleteHistory, clearHistories, saveHistories } from "@/lib/history"
import { useRouter, usePathname } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { nanoid } from "nanoid"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [histories, setHistories] = useState<HistoryItem[]>([])

  // 加载历史记录
  useEffect(() => {
    setHistories(getHistories())
  }, [pathname]) // 当路径变化时重新加载历史记录

  // 新建对话
  const handleNewChat = async () => {
    // 先关闭移动端菜单
    setIsMobileOpen(false)

    const id = nanoid()
    const newHistory: HistoryItem = {
      id,
      title: '新建转写任务',
      date: new Date().toLocaleString(),
      messages: []
    }
    
    // 添加到历史记录
    const histories = getHistories()
    histories.unshift(newHistory)
    saveHistories(histories)
    
    // 更新状态
    setHistories(histories)
    
    // 跳转到新任务页面
    router.replace(`/chat/${id}`)
  }

  // 删除单个历史记录
  const handleDeleteHistory = (id: string) => {
    deleteHistory(id)
    setHistories(getHistories())
  }

  // 清空所有历史记录
  const handleClearHistories = () => {
    clearHistories()
    setHistories([])
  }

  // 选择历史记录
  const handleSelectHistory = (history: HistoryItem) => {
    // 先关闭移动端菜单
    setIsMobileOpen(false)
    
    // 确保当前不在相同页面时才进行跳转
    if (pathname !== `/chat/${history.id}`) {
      router.replace(`/chat/${history.id}`)
    }
  }

  const renderHistoryList = () => (
    <div className="flex flex-col gap-2">
      {histories.length === 0 ? (
        <p className="text-muted-foreground">暂无历史记录</p>
      ) : (
        histories.map((history) => (
          <div key={history.id} className="group flex items-center gap-2">
            <Button
              variant="ghost"
              className="flex-1 justify-start"
              onClick={() => handleSelectHistory(history)}
            >
              <div className="flex flex-col items-start">
                <span className="truncate">{history.title}</span>
                <span className="text-xs text-muted-foreground">
                  {history.date}
                </span>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100"
              onClick={() => handleDeleteHistory(history.id)}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  )

  return (
    <>
      {/* 移动端菜单按钮 */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
          <nav className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">历史记录</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleNewChat}>
                  <Plus className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>清空历史记录</AlertDialogTitle>
                      <AlertDialogDescription>
                        此操作将删除所有历史记录，且无法恢复。是否继续？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistories}>
                        确认
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            {renderHistoryList()}
          </nav>
        </SheetContent>
      </Sheet>

      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex h-full w-[300px] flex-col gap-4 border-r p-4 overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-2">
          <h2 className="text-lg font-semibold">历史记录</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>清空历史记录</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将删除所有历史记录，且无法恢复。是否继续？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistories}>
                    确认
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {renderHistoryList()}
      </div>
    </>
  )
} 