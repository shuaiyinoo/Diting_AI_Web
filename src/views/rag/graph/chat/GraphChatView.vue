<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { fetchGroups } from '@/api/rag/group'
import { graphChat } from '@/api/rag/graph'
import type { CitationItem } from '@/api/rag/qa'
import { extractErrorMessage } from '@/utils/request'
import { useRagStore } from '@/store/modules/rag'
import QaComposer from '@/views/rag/qa/components/QaComposer.vue'
import GraphTraceDialog from '../components/GraphTraceDialog.vue'
import GraphChatSidebar from './components/GraphChatSidebar.vue'
import GraphChatTranscript from './components/GraphChatTranscript.vue'
import GraphChatEmptyHero from './components/GraphChatEmptyHero.vue'
import { useGraphSessions, type GraphMessage } from './composables/useGraphSessions'

defineOptions({ name: 'GraphChatView' })

const appStore = useRagStore()
const {
  sessions,
  activeSession,
  activeSessionId,
  createSession,
  selectSession,
  deleteSession,
  appendMessage,
  updateMessage,
  uid,
} = useGraphSessions()

// ── Group state ──
const groupsLoading = ref(false)
const selectedGroupId = ref<number | null>(appStore.currentGroupId)

const selectedGroupName = computed(() => {
  const g = appStore.visibleGroups.find((x) => x.groupId === selectedGroupId.value)
  return g?.groupName ?? ''
})

const hasGroup = computed(() => selectedGroupId.value !== null)

async function loadGroups() {
  groupsLoading.value = true
  try {
    const result = await fetchGroups()
    appStore.applyGroupQueryResult(result)
    if (
      selectedGroupId.value === null ||
      !appStore.visibleGroups.some((g) => g.groupId === selectedGroupId.value)
    ) {
      selectedGroupId.value = appStore.currentGroupId ?? appStore.visibleGroups[0]?.groupId ?? null
    }
  } catch {
    // ignore
  } finally {
    groupsLoading.value = false
  }
}

watch(selectedGroupId, (v) => {
  appStore.setCurrentGroupId(v)
})

// ── Ask flow ──
const asking = ref(false)

function ensureSessionForAsk(): string {
  if (activeSession.value && activeSession.value.groupId === selectedGroupId.value) {
    return activeSession.value.id
  }
  const s = createSession(selectedGroupId.value, selectedGroupName.value)
  return s.id
}

async function handleAsk(text: string) {
  if (!text.trim() || selectedGroupId.value === null || asking.value) return

  const sessionId = ensureSessionForAsk()
  const now = Date.now()

  // Push user message
  const userMsg: GraphMessage = {
    id: uid(),
    role: 'user',
    content: text,
    createdAt: now,
  }
  appendMessage(sessionId, userMsg)

  // Push pending assistant message
  const assistantId = uid()
  appendMessage(sessionId, {
    id: assistantId,
    role: 'assistant',
    content: '',
    createdAt: Date.now(),
    pending: true,
  })

  asking.value = true
  try {
    const result = await graphChat({ groupId: selectedGroupId.value, question: text })
    updateMessage(sessionId, assistantId, {
      content: result.answer ?? '',
      pending: false,
      answered: result.answered,
      reasonCode: null,
      reasonMessage: null,
      citations: result.citations ?? [],
      graph: result.graph,
      durationMs: result.durationMs,
      showGraph: false,
    })
  } catch (error) {
    updateMessage(sessionId, assistantId, {
      content: '',
      pending: false,
      answered: false,
      reasonCode: 'REQUEST_FAILED',
      reasonMessage: `请求失败：${extractErrorMessage(error)}`,
      citations: [],
      graph: null,
    })
  } finally {
    asking.value = false
  }
}

function handleNewChat() {
  createSession(selectedGroupId.value, selectedGroupName.value)
}

function handleSelectSession(sessionId: string) {
  selectSession(sessionId)
}

function handleDeleteSession(sessionId: string) {
  deleteSession(sessionId)
}

const composerRef = ref<InstanceType<typeof QaComposer> | null>(null)

function handleStarterPick(prompt: string) {
  composerRef.value?.setText(prompt)
}

// ── Graph trace dialog ──
const traceVisible = ref(false)
const traceEntities = ref<string[]>([])

function openTrace(citation: CitationItem) {
  if (!citation.graphEntities || citation.graphEntities.length === 0) return
  traceEntities.value = citation.graphEntities
  traceVisible.value = true
}

// ── Lifecycle ──
onMounted(() => {
  if (appStore.visibleGroups.length === 0) {
    loadGroups()
  } else if (selectedGroupId.value === null) {
    selectedGroupId.value = appStore.visibleGroups[0]?.groupId ?? null
  }
})
</script>

<template>
  <div class="graph-chat-page">
    <GraphChatSidebar
      v-model:selected-group-id="selectedGroupId"
      :groups="appStore.visibleGroups"
      :groups-loading="groupsLoading"
      :sessions="sessions"
      :active-session-id="activeSessionId"
      @new-chat="handleNewChat"
      @select-session="handleSelectSession"
      @delete-session="handleDeleteSession"
    />

    <main class="graph-chat-page__main">
      <template v-if="activeSession && activeSession.messages.length > 0">
        <GraphChatTranscript
          :messages="activeSession.messages"
          :session-id="activeSession.id"
          :group-name="activeSession.groupName"
          :group-id="activeSession.groupId ?? selectedGroupId"
          @inspect-citation="openTrace"
        />
      </template>
      <template v-else>
        <GraphChatEmptyHero
          :group-name="selectedGroupName"
          :has-group="hasGroup"
          @pick="handleStarterPick"
        />
      </template>

      <QaComposer
        ref="composerRef"
        :disabled="!hasGroup"
        :loading="asking"
        :group-name="selectedGroupName"
        placeholder="输入问题，基于知识图谱进行问答"
        @submit="handleAsk"
      />
    </main>

    <GraphTraceDialog
      v-model="traceVisible"
      :group-id="selectedGroupId"
      :entities="traceEntities"
    />
  </div>
</template>

<style scoped>
.graph-chat-page {
  display: flex;
  width: 100%;
  height: calc(100vh - 120px);
  background: var(--surface-white);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.graph-chat-page__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  padding: 10px;
}

@media (max-width: 900px) {
  .graph-chat-page {
    flex-direction: column;
    height: calc(100vh - 120px);
  }
}
</style>
