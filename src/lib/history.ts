export interface HistoryItem {
  id: string
  title: string
  date: string
  messages: any[]
  content?: {
    text: string
    fileQueue: any[]
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
export function addHistory(history: Partial<HistoryItem>) {
  const now = new Date()
  const defaultTitle = `转录记录 ${now.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`

  const newHistory: HistoryItem = {
    id: Math.random().toString(36).substring(2),
    title: history.title || defaultTitle,
    date: now.toISOString(),
    messages: history.messages || [],
    content: history.content
  }

  const histories = getHistories()
  histories.unshift(newHistory)
  saveHistories(histories)
  return newHistory
}

// 重命名历史记录
export function renameHistory(id: string, newTitle: string) {
  const histories = getHistories()
  const updatedHistories = histories.map(h => 
    h.id === id ? { ...h, title: newTitle } : h
  )
  saveHistories(updatedHistories)
}

// 获取单个历史记录
export function getHistory(id: string): HistoryItem | undefined {
  const histories = getHistories()
  return histories.find(h => h.id === id)
}

// 更新历史记录
export function updateHistory(id: string, updates: Partial<HistoryItem>) {
  const histories = getHistories()
  const updatedHistories = histories.map(h => 
    h.id === id ? { ...h, ...updates } : h
  )
  saveHistories(updatedHistories)
}

// 删除历史记录
export function deleteHistory(id: string) {
  const histories = getHistories()
  const updatedHistories = histories.filter(h => h.id !== id)
  saveHistories(updatedHistories)
}

// 清空所有历史记录
export function clearHistories() {
  saveHistories([])
}

// 清理重复的历史记录
function cleanupHistories(): HistoryItem[] {
  const histories = getHistories()
  const seen = new Set<string>()
  const cleanedHistories = histories.filter(h => {
    if (seen.has(h.id)) {
      return false
    }
    seen.add(h.id)
    return true
  })
  saveHistories(cleanedHistories)
  return cleanedHistories
} 