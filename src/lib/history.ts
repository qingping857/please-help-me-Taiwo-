export interface HistoryItem {
  id: string
  title: string
  date: string
  messages: any[]
  content?: {
    text: string
    fileQueue: any[]
    currentPageIndex: number
  }
}

// 从localStorage获取历史记录
export function getHistories(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  const histories = localStorage.getItem('chat-histories')
  const parsedHistories = histories ? JSON.parse(histories) : []
  
  // 检查是否需要清理
  if (parsedHistories.length > 0) {
    const uniqueIds = new Set<string>()
    let hasDuplicates = false
    
    parsedHistories.forEach((h: HistoryItem) => {
      if (uniqueIds.has(h.id)) {
        hasDuplicates = true
      }
      uniqueIds.add(h.id)
    })
    
    if (hasDuplicates) {
      return cleanupHistories()
    }
  }
  
  return parsedHistories
}

// 保存历史记录到localStorage
export function saveHistories(histories: HistoryItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem('chat-histories', JSON.stringify(histories))
}

// 添加新的历史记录
export function addHistory(history: HistoryItem) {
  const histories = getHistories()
  histories.unshift(history) // 新记录添加到开头
  saveHistories(histories)
}

// 删除历史记录
export function deleteHistory(id: string) {
  const histories = getHistories()
  const newHistories = histories.filter(h => h.id !== id)
  saveHistories(newHistories)
}

// 清空所有历史记录
export function clearHistories() {
  saveHistories([])
}

// 更新历史记录
export function updateHistory(id: string, history: Partial<HistoryItem>) {
  const histories = getHistories()
  const index = histories.findIndex(h => h.id === id)
  if (index !== -1) {
    histories[index] = { ...histories[index], ...history }
    saveHistories(histories)
  }
}

// 清理无效的历史记录
export function cleanupHistories() {
  const histories = getHistories()
  const uniqueIds = new Set<string>()
  const cleanedHistories = histories.filter(h => {
    if (uniqueIds.has(h.id)) {
      return false // 删除重复的ID
    }
    uniqueIds.add(h.id)
    return true
  })
  saveHistories(cleanedHistories)
  return cleanedHistories
} 