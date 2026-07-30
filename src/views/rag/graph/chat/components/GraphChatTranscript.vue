<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { GraphMessage as GraphMessageType } from '../composables/useGraphSessions'
import type { CitationItem } from '@/api/rag/qa'
import GraphChatMessage from './GraphChatMessage.vue'

const props = defineProps<{
  messages: GraphMessageType[]
  sessionId: string
  groupName: string
  groupId?: number | null
}>()

const emit = defineEmits<{
  'inspect-citation': [citation: CitationItem]
}>()

const scrollRef = ref<HTMLElement | null>(null)

function scrollToBottom(smooth = true) {
  const el = scrollRef.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToBottom(true)
  },
)

watch(
  () => props.sessionId,
  async () => {
    await nextTick()
    scrollToBottom(false)
  },
)

watch(
  () => props.messages.map((m) => m.content + (m.pending ? '1' : '0')).join('|'),
  async () => {
    await nextTick()
    scrollToBottom(true)
  },
)
</script>

<template>
  <div class="gc-transcript">
    <header class="gc-transcript__head">
      <div class="gc-transcript__head-left">
        <span class="gc-transcript__eyebrow">Active Thread</span>
        <h2 class="gc-transcript__title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="5" cy="17" r="2.5" />
            <circle cx="19" cy="17" r="2.5" />
            <path d="M11 7.2 6.3 14.8M13 7.2 17.7 14.8M7.2 17h9.6" stroke-dasharray="2 2" />
          </svg>
          <span>{{ groupName || '未指定知识库' }}</span>
        </h2>
      </div>
      <div class="gc-transcript__head-right">
        <span class="gc-transcript__counter">
          <span class="gc-transcript__counter-num">{{ messages.length }}</span>
          <span class="gc-transcript__counter-label">条消息</span>
        </span>
      </div>
    </header>

    <div ref="scrollRef" class="gc-transcript__scroll">
      <div class="gc-transcript__paper">
        <GraphChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :group-id="groupId ?? null"
          @inspect-citation="(c) => emit('inspect-citation', c)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.gc-transcript {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  position: relative;
}

.gc-transcript__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 18px 32px 14px;
  border-bottom: 1px solid var(--border-subtle);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 5;
  flex-shrink: 0;
}

.gc-transcript__head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gc-transcript__eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #8b5cf6;
}

.gc-transcript__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.gc-transcript__title svg {
  color: #8b5cf6;
}

.gc-transcript__counter {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.gc-transcript__counter-num {
  font-family: 'Poppins', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.gc-transcript__counter-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.gc-transcript__scroll {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
  background-image:
    linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  background-position: 0 0;
}

.gc-transcript__scroll::-webkit-scrollbar {
  width: 6px;
}

.gc-transcript__scroll::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

.gc-transcript__scroll::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

.gc-transcript__paper {
  max-width: 860px;
  margin: 0 auto;
  padding: 8px 0 16px;
}

@media (max-width: 720px) {
  .gc-transcript__head {
    padding: 14px 18px 12px;
  }

  .gc-transcript__title {
    font-size: 0.92rem;
  }
}
</style>
