<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import PageHeaderHero from '@/components/layout/PageHeaderHero.vue'
import { useRagStore } from '@/store/modules/rag'
import { fetchGroups } from '@/api/rag/group'
import { graphChat, type GraphVisualization } from '@/api/rag/graph'
import type { CitationItem } from '@/api/rag/qa'
import { extractErrorMessage } from '@/utils/request'
import RetrievalSourceTag from '@/views/rag/components/RetrievalSourceTag.vue'
import GraphCanvas from '../components/GraphCanvas.vue'
import GraphTraceDialog from '../components/GraphTraceDialog.vue'

defineOptions({ name: 'GraphChatView' })

marked.setOptions({ gfm: true, breaks: true })

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  answered?: boolean
  citations?: CitationItem[]
  graph?: GraphVisualization | null
  durationMs?: number
  showGraph?: boolean
}

const appStore = useRagStore()

const groupsLoading = ref(false)
const selectedGroupId = ref<number | null>(appStore.currentGroupId)

const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const asking = ref(false)
const threadRef = ref<HTMLElement | null>(null)
let messageSeq = 0

// ── 图谱溯源弹窗 ──
const traceVisible = ref(false)
const traceEntities = ref<string[]>([])

const canSend = computed(
  () => !asking.value && inputText.value.trim().length > 0 && selectedGroupId.value !== null
)

const SUGGESTIONS = [
  '核心实体之间有什么关系？',
  '文档中提到了哪些关键概念？',
  '帮我梳理这个知识库的知识脉络'
]

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
    ElMessage.error('加载群组失败')
  } finally {
    groupsLoading.value = false
  }
}

function renderMarkdown(raw: string): string {
  return marked.parse(raw ?? '') as string
}

async function scrollToBottom() {
  await nextTick()
  const el = threadRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function handleSend(text?: string) {
  const question = (text ?? inputText.value).trim()
  if (!question || asking.value || selectedGroupId.value === null) return

  messages.value.push({ id: ++messageSeq, role: 'user', content: question })
  inputText.value = ''
  asking.value = true
  scrollToBottom()

  try {
    const result = await graphChat({ groupId: selectedGroupId.value, question })
    messages.value.push({
      id: ++messageSeq,
      role: 'assistant',
      content: result.answer ?? '',
      answered: result.answered,
      citations: result.citations ?? [],
      graph: result.graph,
      durationMs: result.durationMs,
      showGraph: false
    })
  } catch (error) {
    messages.value.push({
      id: ++messageSeq,
      role: 'assistant',
      content: `提问失败：${extractErrorMessage(error)}`,
      answered: false
    })
  } finally {
    asking.value = false
    scrollToBottom()
  }
}

function openTrace(citation: CitationItem) {
  if (!citation.graphEntities || citation.graphEntities.length === 0) return
  traceEntities.value = citation.graphEntities
  traceVisible.value = true
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return '--'
  return (score * 100).toFixed(1) + '%'
}

function fileTag(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'PDF'
  if (ext === 'md') return 'MD'
  if (ext === 'docx' || ext === 'doc') return 'DOC'
  if (ext === 'txt') return 'TXT'
  return ext.toUpperCase() || 'DOC'
}

function tagClass(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  if (ext === 'pdf') return 'graph-cite__type--pdf'
  if (ext === 'md') return 'graph-cite__type--md'
  if (ext === 'docx' || ext === 'doc') return 'graph-cite__type--doc'
  return 'graph-cite__type--txt'
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return ''
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

onMounted(() => {
  if (appStore.visibleGroups.length === 0) {
    loadGroups()
  } else if (selectedGroupId.value === null) {
    selectedGroupId.value = appStore.visibleGroups[0]?.groupId ?? null
  }
})
</script>

<template>
  <div class="graph-chat">
    <PageHeaderHero
      eyebrow="GRAPH RAG"
      title="图谱问答"
      description="基于知识图谱的实体与关系进行问答，回答附带引用来源与图谱证据。"
    >
      <template #actions>
        <el-select
          v-model="selectedGroupId"
          :loading="groupsLoading"
          placeholder="选择知识库群组"
          class="graph-chat__group-select"
        >
          <el-option
            v-for="group in appStore.visibleGroups"
            :key="group.groupId"
            :label="group.groupName"
            :value="group.groupId"
          />
        </el-select>
      </template>
    </PageHeaderHero>

    <div ref="threadRef" class="graph-chat__thread">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="graph-chat__welcome">
        <div class="graph-chat__welcome-icon">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="10" r="5" fill="#4A90D9" />
            <circle cx="10" cy="34" r="5" fill="#8b5cf6" />
            <circle cx="38" cy="34" r="5" fill="#14b8a6" />
            <path d="M24 15v6M13 30.5 19 22M35 30.5 29 22" stroke="#94a3b8" stroke-width="2" />
            <path d="M15 34h18" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3" />
          </svg>
        </div>
        <h3>向知识图谱提问</h3>
        <p>我会从图谱中识别实体、遍历关系，并结合原文片段生成回答。</p>
        <div class="graph-chat__suggestions">
          <button
            v-for="item in SUGGESTIONS"
            :key="item"
            class="graph-chat__suggestion"
            :disabled="asking || selectedGroupId === null"
            @click="handleSend(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="message in messages"
        :key="message.id"
        class="graph-chat__message"
        :class="`graph-chat__message--${message.role}`"
      >
        <div class="graph-chat__bubble">
          <div v-if="message.role === 'user'" class="graph-chat__text">{{ message.content }}</div>
          <template v-else>
            <div class="graph-chat__markdown" v-html="renderMarkdown(message.content)" />

            <!-- 引用来源 -->
            <div v-if="message.citations && message.citations.length > 0" class="graph-chat__citations">
              <header class="graph-cite__head">
                <span class="graph-cite__eyebrow">Evidence Chain</span>
                <span class="graph-cite__title">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <strong>引用证据</strong>
                  <span class="graph-cite__count">{{ message.citations.length }}</span>
                </span>
              </header>
              <div class="graph-cite__grid">
                <button
                  v-for="(citation, index) in message.citations"
                  :key="`${citation.documentId ?? 'x'}-${citation.chunkId ?? index}`"
                  class="graph-cite__card"
                  type="button"
                  :disabled="citation.documentId === null"
                  @click="citation.documentId !== null && openTrace(citation)"
                >
                  <div class="graph-cite__card-head">
                    <span class="graph-cite__index">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span class="graph-cite__type" :class="tagClass(citation.fileName)">
                      {{ fileTag(citation.fileName) }}
                    </span>
                    <span class="graph-cite__score">{{ formatScore(citation.score) }}</span>
                  </div>
                  <h4 class="graph-cite__filename" :title="citation.fileName">
                    {{ citation.fileName }}
                  </h4>
                  <div class="graph-cite__card-foot">
                    <RetrievalSourceTag :source="citation.retrievalSource ?? 'GRAPH'" />
                    <template v-if="citation.graphEntities && citation.graphEntities.length > 0">
                      <span
                        v-for="entity in citation.graphEntities.slice(0, 3)"
                        :key="entity"
                        class="graph-cite__entity"
                        @click.stop="openTrace(citation)"
                      >
                        {{ entity }}
                      </span>
                    </template>
                    <span v-if="citation.chunkIndex !== null" class="graph-cite__chunk">
                      #chunk {{ citation.chunkIndex }}
                    </span>
                  </div>
                  <div class="graph-cite__meter">
                    <span class="graph-cite__meter-fill" :style="{ width: `${Math.min(100, citation.score * 100)}%` }" />
                  </div>
                </button>
              </div>
            </div>

            <!-- 图谱证据 -->
            <div v-if="message.graph && message.graph.nodes.length > 0" class="graph-chat__graph">
              <button class="graph-chat__graph-toggle" @click="message.showGraph = !message.showGraph">
                <span
                  class="graph-chat__graph-arrow"
                  :class="{ 'is-open': message.showGraph }"
                >▸</span>
                图谱证据（{{ message.graph.nodes.length }} 实体 · {{ message.graph.edges.length }} 关系 ·
                {{ formatDuration(message.durationMs) }}）
              </button>
              <div v-show="message.showGraph" class="graph-chat__graph-canvas">
                <GraphCanvas :graph="message.graph" :minimap="false" :toolbar="false" />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 加载态 -->
      <div v-if="asking" class="graph-chat__message graph-chat__message--assistant">
        <div class="graph-chat__bubble graph-chat__bubble--loading">
          <span class="graph-chat__loading-dot" />
          <span class="graph-chat__loading-dot" />
          <span class="graph-chat__loading-dot" />
          <span class="graph-chat__loading-text">正在检索知识图谱…</span>
        </div>
      </div>
    </div>

    <div class="graph-chat__input-bar">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        resize="none"
        placeholder="输入问题，Enter 发送，Shift+Enter 换行"
        @keydown.enter.exact.prevent="handleSend()"
      />
      <el-button type="primary" round :disabled="!canSend" :loading="asking" @click="handleSend()">
        发送
      </el-button>
    </div>

    <GraphTraceDialog v-model="traceVisible" :group-id="selectedGroupId" :entities="traceEntities" />
  </div>
</template>

<style scoped>
.graph-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 24px 24px;
}

.graph-chat__group-select {
  width: 200px;
}

.graph-chat__thread {
  flex: 1;
  overflow-y: auto;
  padding: 4px 2px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.graph-chat__welcome {
  margin: auto;
  max-width: 520px;
  text-align: center;
  padding: 40px 20px;
}

.graph-chat__welcome-icon {
  width: 88px;
  height: 88px;
  margin: 0 auto 18px;
  border-radius: 24px;
  background:
    radial-gradient(200px 90px at 80% 0%, rgba(139, 92, 246, 0.12), transparent 60%),
    linear-gradient(135deg, rgba(74, 144, 217, 0.12), rgba(20, 184, 166, 0.08));
  border: 1px solid rgba(74, 144, 217, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
}

.graph-chat__welcome-icon svg {
  width: 52px;
  height: 52px;
}

.graph-chat__welcome h3 {
  margin: 0 0 8px;
  font-size: 1.15rem;
  color: var(--text-primary);
}

.graph-chat__welcome p {
  margin: 0 0 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.graph-chat__suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.graph-chat__suggestion {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid rgba(74, 144, 217, 0.22);
  background: var(--surface-white);
  color: var(--brand-primary-dark);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.18s ease;
}

.graph-chat__suggestion:hover:not(:disabled) {
  background: rgba(74, 144, 217, 0.08);
  transform: translateY(-1px);
}

.graph-chat__suggestion:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.graph-chat__message {
  display: flex;
}

.graph-chat__message--user {
  justify-content: flex-end;
}

.graph-chat__bubble {
  max-width: 78%;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
}

.graph-chat__message--user .graph-chat__bubble {
  background: linear-gradient(135deg, #4a90d9, #3a7bc8);
  border: none;
  color: #fff;
}

.graph-chat__text {
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.graph-chat__markdown {
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-primary);
}

.graph-chat__markdown :deep(p) {
  margin: 0 0 8px;
}

.graph-chat__markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.graph-chat__markdown :deep(ul),
.graph-chat__markdown :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}

.graph-chat__markdown :deep(ul) {
  list-style: disc;
}

.graph-chat__markdown :deep(ol) {
  list-style: decimal;
}

.graph-chat__markdown :deep(code) {
  padding: 1px 6px;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.06);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8em;
}

.graph-chat__markdown :deep(strong) {
  font-weight: 700;
}

.graph-chat__citations {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(15, 23, 42, 0.1);
}

/* ── 引用证据卡片（对齐 CitationRail 风格） ── */

.graph-cite__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
  padding-left: 2px;
}

.graph-cite__eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand-primary);
}

.graph-cite__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.graph-cite__title svg {
  color: var(--brand-primary);
}

.graph-cite__title strong {
  font-weight: 600;
  color: var(--text-primary);
}

.graph-cite__count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.14);
  padding: 1px 7px;
  border-radius: 100px;
}

.graph-cite__grid {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
}

.graph-cite__grid::-webkit-scrollbar {
  height: 6px;
}

.graph-cite__grid::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

.graph-cite__card {
  flex-shrink: 0;
  width: 260px;
  padding: 12px 14px 12px;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}

.graph-cite__card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, var(--brand-primary), var(--brand-accent));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.graph-cite__card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--brand-primary);
  box-shadow: 0 8px 20px rgba(74, 144, 217, 0.12);
}

.graph-cite__card:hover:not(:disabled)::before {
  opacity: 1;
}

.graph-cite__card:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.graph-cite__card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.graph-cite__index {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.graph-cite__type {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 4px;
}

.graph-cite__type--pdf {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.graph-cite__type--md {
  background: rgba(74, 144, 217, 0.1);
  color: var(--brand-primary);
}

.graph-cite__type--doc {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.graph-cite__type--txt {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
}

.graph-cite__score {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--brand-accent-dark);
}

.graph-cite__filename {
  margin: 0 0 10px;
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.graph-cite__card-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.graph-cite__entity {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.08);
  color: #7c3aed;
  font-size: 0.68rem;
  font-weight: 600;
  transition: background 0.15s ease;
}

.graph-cite__entity:hover {
  background: rgba(139, 92, 246, 0.18);
}

.graph-cite__chunk {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-left: auto;
}

.graph-cite__meter {
  width: 100%;
  height: 3px;
  background: var(--surface-muted);
  border-radius: 2px;
  overflow: hidden;
}

.graph-cite__meter-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-accent));
  border-radius: 2px;
  transition: width 0.4s ease;
}

.graph-chat__graph {
  margin-top: 10px;
}

.graph-chat__graph-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(74, 144, 217, 0.2);
  background: rgba(74, 144, 217, 0.06);
  color: var(--brand-primary-dark);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.graph-chat__graph-arrow {
  display: inline-block;
  transition: transform 0.18s ease;
}

.graph-chat__graph-arrow.is-open {
  transform: rotate(90deg);
}

.graph-chat__graph-canvas {
  margin-top: 8px;
  height: 340px;
}

.graph-chat__bubble--loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.graph-chat__loading-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4a90d9;
  animation: graph-chat-bounce 1.2s infinite ease-in-out;
}

.graph-chat__loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.graph-chat__loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.graph-chat__loading-text {
  margin-left: 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

@keyframes graph-chat-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

.graph-chat__input-bar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.graph-chat__input-bar :deep(.el-textarea__inner) {
  border-radius: 12px;
}
</style>
