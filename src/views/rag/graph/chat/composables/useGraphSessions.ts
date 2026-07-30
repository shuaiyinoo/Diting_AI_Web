import { ref, computed } from 'vue'
import type { CitationItem } from '@/api/rag/qa'
import type { GraphVisualization } from '@/api/rag/graph'

export type GraphRole = 'user' | 'assistant'

export interface GraphMessage {
  id: string
  role: GraphRole
  content: string
  createdAt: number
  pending?: boolean
  answered?: boolean
  reasonCode?: string | null
  reasonMessage?: string | null
  citations?: CitationItem[]
  graph?: GraphVisualization | null
  durationMs?: number
  showGraph?: boolean
}

export interface GraphSession {
  id: string
  title: string
  groupId: number | null
  groupName: string
  messages: GraphMessage[]
  createdAt: number
  updatedAt: number
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const sessions = ref<GraphSession[]>([])
const activeSessionId = ref<string | null>(null)

export function useGraphSessions() {
  const activeSession = computed<GraphSession | null>(() => {
    if (!activeSessionId.value) return null
    return sessions.value.find((s) => s.id === activeSessionId.value) ?? null
  })

  function createSession(groupId: number | null, groupName: string): GraphSession {
    const now = Date.now()
    const session: GraphSession = {
      id: uid(),
      title: '新的图谱问答',
      groupId,
      groupName,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    sessions.value.unshift(session)
    activeSessionId.value = session.id
    return session
  }

  function selectSession(id: string) {
    if (sessions.value.some((s) => s.id === id)) {
      activeSessionId.value = id
    }
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex((s) => s.id === id)
    if (idx === -1) return
    sessions.value.splice(idx, 1)
    if (activeSessionId.value === id) {
      activeSessionId.value = sessions.value[0]?.id ?? null
    }
  }

  function clearAllSessions() {
    sessions.value = []
    activeSessionId.value = null
  }

  function appendMessage(sessionId: string, message: GraphMessage) {
    const s = sessions.value.find((x) => x.id === sessionId)
    if (!s) return
    s.messages.push(message)
    s.updatedAt = Date.now()
    if (message.role === 'user' && s.title === '新的图谱问答') {
      const firstLine = message.content.trim().split('\n')[0] ?? ''
      s.title = firstLine.length > 24 ? firstLine.slice(0, 24) + '…' : firstLine || '新的图谱问答'
    }
  }

  function updateMessage(sessionId: string, messageId: string, patch: Partial<GraphMessage>) {
    const s = sessions.value.find((x) => x.id === sessionId)
    if (!s) return
    const m = s.messages.find((x) => x.id === messageId)
    if (!m) return
    Object.assign(m, patch)
    s.updatedAt = Date.now()
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
    clearAllSessions,
    appendMessage,
    updateMessage,
    uid,
  }
}
