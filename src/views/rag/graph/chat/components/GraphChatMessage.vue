<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import type { GraphMessage } from '../composables/useGraphSessions'
import type { CitationItem } from '@/api/rag/qa'
import RetrievalSourceTag from '@/views/rag/components/RetrievalSourceTag.vue'
import GraphCanvas from '../../components/GraphCanvas.vue'

const props = defineProps<{
  message: GraphMessage
  groupId?: number | null
}>()

const emit = defineEmits<{
  'inspect-citation': [citation: CitationItem]
}>()

marked.setOptions({
  gfm: true,
  breaks: true,
})

const rendered = computed(() => {
  if (props.message.role === 'user') {
    return ''
  }
  const raw = props.message.content || ''
  if (!raw.trim()) return ''
  try {
    return marked.parse(raw) as string
  } catch {
    return `<p>${escapeHtml(raw)}</p>`
  }
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[c] ?? c
  })
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  if (ext === 'pdf') return 'gc-msg-cite__type--pdf'
  if (ext === 'md') return 'gc-msg-cite__type--md'
  if (ext === 'docx' || ext === 'doc') return 'gc-msg-cite__type--doc'
  return 'gc-msg-cite__type--txt'
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return ''
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function toggleGraph() {
  props.message.showGraph = !props.message.showGraph
}
</script>

<template>
  <article class="gc-msg" :class="`gc-msg--${message.role}`">
    <div class="gc-msg__avatar">
      <template v-if="message.role === 'user'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </template>
      <template v-else>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="17" r="2.5" />
          <circle cx="19" cy="17" r="2.5" />
          <path d="M11 7.2 6.3 14.8M13 7.2 17.7 14.8M7.2 17h9.6" stroke-dasharray="2 2" />
        </svg>
      </template>
    </div>

    <div class="gc-msg__body">
      <header class="gc-msg__head">
        <span class="gc-msg__role">{{ message.role === 'user' ? 'You' : 'Graph Agent' }}</span>
        <span class="gc-msg__time">{{ formatTime(message.createdAt) }}</span>
      </header>

      <!-- User message -->
      <div v-if="message.role === 'user'" class="gc-msg__user-text">
        {{ message.content }}
      </div>

      <!-- Assistant pending / thinking (no content yet) -->
      <div v-else-if="message.pending && !message.content" class="gc-msg__thinking">
        <span class="gc-msg__thinking-dot" />
        <span class="gc-msg__thinking-dot" />
        <span class="gc-msg__thinking-dot" />
        <span class="gc-msg__thinking-label">正在检索知识图谱…</span>
      </div>

      <!-- Assistant streaming content -->
      <div v-else-if="message.pending" class="gc-msg__streaming">
        <div class="gc-msg__markdown" v-html="rendered" />
        <span class="gc-msg__cursor" />
      </div>

      <!-- Assistant refused -->
      <div v-else-if="message.answered === false" class="gc-msg__refused">
        <div class="gc-msg__refused-head">
          <div class="gc-msg__refused-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span class="gc-msg__refused-title">未能回答</span>
          <code v-if="message.reasonCode" class="gc-msg__refused-code">{{ message.reasonCode }}</code>
        </div>
        <p class="gc-msg__refused-text">
          {{ message.reasonMessage || '图谱中未找到足够的实体与关系来生成可靠回答。请尝试换一种问法，或先确认相关文档已上传并完成图谱构建。' }}
        </p>
      </div>

      <!-- Assistant answer markdown -->
      <div v-else class="gc-msg__markdown" v-html="rendered" />

      <!-- 引用来源 -->
      <div
        v-if="message.role === 'assistant' && message.citations && message.citations.length > 0"
        class="gc-msg__citations"
      >
        <header class="gc-msg-cite__head">
          <span class="gc-msg-cite__eyebrow">Evidence Chain</span>
          <span class="gc-msg-cite__title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <strong>引用证据</strong>
            <span class="gc-msg-cite__count">{{ message.citations.length }}</span>
          </span>
        </header>
        <div class="gc-msg-cite__grid">
          <button
            v-for="(citation, index) in message.citations"
            :key="`${citation.documentId ?? 'x'}-${citation.chunkId ?? index}`"
            class="gc-msg-cite__card"
            type="button"
            :disabled="!citation.graphEntities || citation.graphEntities.length === 0"
            @click="citation.graphEntities && citation.graphEntities.length > 0 && emit('inspect-citation', citation)"
          >
            <div class="gc-msg-cite__card-head">
              <span class="gc-msg-cite__index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="gc-msg-cite__type" :class="tagClass(citation.fileName)">
                {{ fileTag(citation.fileName) }}
              </span>
              <span class="gc-msg-cite__score">{{ formatScore(citation.score) }}</span>
            </div>
            <h4 class="gc-msg-cite__filename" :title="citation.fileName">
              {{ citation.fileName }}
            </h4>
            <div class="gc-msg-cite__card-foot">
              <RetrievalSourceTag :source="citation.retrievalSource ?? 'GRAPH'" />
              <template v-if="citation.graphEntities && citation.graphEntities.length > 0">
                <span
                  v-for="entity in citation.graphEntities.slice(0, 3)"
                  :key="entity"
                  class="gc-msg-cite__entity"
                >
                  {{ entity }}
                </span>
              </template>
              <span v-if="citation.chunkIndex !== null" class="gc-msg-cite__chunk">
                #chunk {{ citation.chunkIndex }}
              </span>
            </div>
            <div class="gc-msg-cite__meter">
              <span class="gc-msg-cite__meter-fill" :style="{ width: `${Math.min(100, citation.score * 100)}%` }" />
            </div>
          </button>
        </div>
      </div>

      <!-- 图谱证据 -->
      <div v-if="message.role === 'assistant' && message.graph && message.graph.nodes.length > 0" class="gc-msg__graph">
        <button class="gc-msg__graph-toggle" @click="toggleGraph">
          <span
            class="gc-msg__graph-arrow"
            :class="{ 'is-open': message.showGraph }"
          >▸</span>
          图谱证据（{{ message.graph.nodes.length }} 实体 · {{ message.graph.edges.length }} 关系 ·
          {{ formatDuration(message.durationMs) }}）
        </button>
        <div v-show="message.showGraph" class="gc-msg__graph-canvas">
          <GraphCanvas :graph="message.graph" :minimap="false" :toolbar="false" />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.gc-msg {
  display: flex;
  gap: 16px;
  padding: 22px 32px 22px 28px;
  position: relative;
  animation: gc-msg-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes gc-msg-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gc-msg--user {
  background: transparent;
}

.gc-msg--assistant {
  background: linear-gradient(180deg, rgba(250, 250, 247, 0.6), rgba(250, 250, 247, 0.3));
  border-top: 1px solid rgba(15, 23, 42, 0.05);
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
}

.gc-msg__avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.gc-msg__avatar svg {
  width: 16px;
  height: 16px;
}

.gc-msg--user .gc-msg__avatar {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.gc-msg--assistant .gc-msg__avatar {
  background: linear-gradient(135deg, #8b5cf6, #4A90D9);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
}

.gc-msg__body {
  flex: 1;
  min-width: 0;
}

.gc-msg__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.gc-msg__role {
  font-family: 'Poppins', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.gc-msg__time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* User text */
.gc-msg__user-text {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* Thinking */
.gc-msg__thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 100px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.gc-msg__thinking-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  animation: gc-thinking-bounce 1.3s ease-in-out infinite;
}

.gc-msg__thinking-dot:nth-child(2) { animation-delay: 0.15s; }
.gc-msg__thinking-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes gc-thinking-bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.gc-msg__thinking-label {
  margin-left: 6px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

/* Streaming */
.gc-msg__streaming {
  display: inline;
}

.gc-msg__cursor {
  display: inline-block;
  width: 1px;
  height: 1.15em;
  margin-left: 1px;
  background: #8b5cf6;
  vertical-align: text-bottom;
  animation: gc-cursor-blink 1s step-end infinite;
}

@keyframes gc-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Refused */
.gc-msg__refused {
  padding: 14px 16px;
  background: rgba(239, 68, 68, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 10px;
}

.gc-msg__refused-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.gc-msg__refused-icon {
  display: flex;
  color: #dc2626;
}

.gc-msg__refused-title {
  font-family: 'Poppins', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #dc2626;
}

.gc-msg__refused-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.gc-msg__refused-text {
  margin: 0;
  font-size: 0.87rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Markdown styles */
.gc-msg__markdown {
  font-size: 0.93rem;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;
}

.gc-msg__markdown :deep(h1),
.gc-msg__markdown :deep(h2),
.gc-msg__markdown :deep(h3),
.gc-msg__markdown :deep(h4) {
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
  margin: 16px 0 8px;
}

.gc-msg__markdown :deep(h1) { font-size: 1.4rem; }
.gc-msg__markdown :deep(h2) { font-size: 1.2rem; }
.gc-msg__markdown :deep(h3) { font-size: 1.05rem; }
.gc-msg__markdown :deep(h4) { font-size: 0.95rem; }

.gc-msg__markdown :deep(p) {
  margin: 10px 0;
}

.gc-msg__markdown :deep(ul),
.gc-msg__markdown :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.gc-msg__markdown :deep(ul) { list-style: disc; }
.gc-msg__markdown :deep(ol) { list-style: decimal; }

.gc-msg__markdown :deep(li) {
  margin: 4px 0;
  padding-left: 3px;
}

.gc-msg__markdown :deep(li::marker) {
  color: #8b5cf6;
}

.gc-msg__markdown :deep(code) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.84em;
  padding: 1px 6px;
  background: rgba(15, 23, 42, 0.06);
  border-radius: 4px;
  color: #7c3aed;
}

.gc-msg__markdown :deep(pre) {
  margin: 12px 0;
  padding: 14px 16px;
  background: #0f172a;
  border-radius: 10px;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #e2e8f0;
  border: 1px solid #1e293b;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
}

.gc-msg__markdown :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}

.gc-msg__markdown :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 3px solid #8b5cf6;
  background: rgba(139, 92, 246, 0.06);
  border-radius: 0 6px 6px 0;
  color: var(--text-secondary);
  font-style: italic;
}

.gc-msg__markdown :deep(a) {
  color: #8b5cf6;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  transition: color 0.15s ease;
}

.gc-msg__markdown :deep(a:hover) {
  color: #7c3aed;
}

.gc-msg__markdown :deep(strong) {
  font-weight: 700;
  color: var(--text-primary);
}

.gc-msg__markdown :deep(hr) {
  margin: 18px 0;
  border: none;
  border-top: 1px dashed var(--border-default);
}

.gc-msg__markdown :deep(table) {
  width: 100%;
  margin: 12px 0;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.gc-msg__markdown :deep(th),
.gc-msg__markdown :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--border-default);
  text-align: left;
}

.gc-msg__markdown :deep(th) {
  background: var(--surface-subtle);
  font-weight: 700;
  color: var(--text-primary);
}

.gc-msg__markdown :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
}

/* ── 引用证据卡片 ── */
.gc-msg__citations {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(15, 23, 42, 0.1);
}

.gc-msg-cite__head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
  padding-left: 2px;
}

.gc-msg-cite__eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8b5cf6;
}

.gc-msg-cite__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.gc-msg-cite__title svg {
  color: #8b5cf6;
}

.gc-msg-cite__title strong {
  font-weight: 600;
  color: var(--text-primary);
}

.gc-msg-cite__count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.14);
  padding: 1px 7px;
  border-radius: 100px;
}

.gc-msg-cite__grid {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 2px 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
}

.gc-msg-cite__grid::-webkit-scrollbar {
  height: 6px;
}

.gc-msg-cite__grid::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

.gc-msg-cite__card {
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

.gc-msg-cite__card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, #8b5cf6, #4A90D9);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.gc-msg-cite__card:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #8b5cf6;
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.12);
}

.gc-msg-cite__card:hover:not(:disabled)::before {
  opacity: 1;
}

.gc-msg-cite__card:disabled {
  cursor: default;
  opacity: 0.85;
}

.gc-msg-cite__card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.gc-msg-cite__index {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.gc-msg-cite__type {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 4px;
}

.gc-msg-cite__type--pdf {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.gc-msg-cite__type--md {
  background: rgba(74, 144, 217, 0.1);
  color: var(--brand-primary);
}

.gc-msg-cite__type--doc {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.gc-msg-cite__type--txt {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
}

.gc-msg-cite__score {
  margin-left: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--brand-accent-dark);
}

.gc-msg-cite__filename {
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

.gc-msg-cite__card-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.gc-msg-cite__entity {
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.08);
  color: #7c3aed;
  font-size: 0.68rem;
  font-weight: 600;
}

.gc-msg-cite__chunk {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-left: auto;
}

.gc-msg-cite__meter {
  width: 100%;
  height: 3px;
  background: var(--surface-muted);
  border-radius: 2px;
  overflow: hidden;
}

.gc-msg-cite__meter-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #4A90D9);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── 图谱证据 ── */
.gc-msg__graph {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(15, 23, 42, 0.1);
}

.gc-msg__graph-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: rgba(139, 92, 246, 0.06);
  color: #7c3aed;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.gc-msg__graph-arrow {
  display: inline-block;
  transition: transform 0.18s ease;
}

.gc-msg__graph-arrow.is-open {
  transform: rotate(90deg);
}

.gc-msg__graph-canvas {
  margin-top: 8px;
  height: 340px;
}

@media (max-width: 720px) {
  .gc-msg {
    padding: 18px 18px 18px 16px;
    gap: 12px;
  }
}
</style>
