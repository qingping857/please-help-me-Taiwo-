export interface HistoryItem {
  id: string
  title: string
  date: string
  messages: {
    id: string
    role: 'user' | 'assistant'
    content: string
    audioUrl?: string
  }[]
}

// 从localStorage获取历史记录
export function getHistories(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  const histories = localStorage.getItem('chat-histories')
  return histories ? JSON.parse(histories) : []
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