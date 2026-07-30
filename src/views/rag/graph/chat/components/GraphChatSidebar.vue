<script setup lang="ts">
import { computed } from 'vue'
import type { VisibleGroup } from '@/api/rag/types'
import type { GraphSession } from '../composables/useGraphSessions'

const props = defineProps<{
  groups: VisibleGroup[]
  selectedGroupId: number | null
  groupsLoading: boolean
  sessions: GraphSession[]
  activeSessionId: string | null
}>()

const emit = defineEmits<{
  'update:selectedGroupId': [val: number | null]
  'new-chat': []
  'select-session': [id: string]
  'delete-session': [id: string]
}>()

const groupValue = computed({
  get: () => props.selectedGroupId,
  set: (v) => emit('update:selectedGroupId', v),
})

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())}`
}
</script>

<template>
  <aside class="gc-sidebar">
    <!-- Brand mark -->
    <div class="gc-sidebar__brand">
      <div class="gc-sidebar__brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="17" r="2.5" />
          <circle cx="19" cy="17" r="2.5" />
          <path d="M11 7.2 6.3 14.8M13 7.2 17.7 14.8M7.2 17h9.6" stroke-dasharray="2 2" />
        </svg>
      </div>
      <div class="gc-sidebar__brand-text">
        <span class="gc-sidebar__brand-eyebrow">Argus Research</span>
        <span class="gc-sidebar__brand-title">Graph Q&amp;A</span>
      </div>
    </div>

    <!-- Knowledge base picker -->
    <div class="gc-sidebar__section">
      <label class="gc-sidebar__label">
        <span>知识库</span>
        <span class="gc-sidebar__label-dot" />
      </label>
      <div class="gc-sidebar__picker">
        <svg class="gc-sidebar__picker-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v7c0 1.7 4 3 9 3s9-1.3 9-3V5" />
          <path d="M3 12v7c0 1.7 4 3 9 3s9-1.3 9-3v-7" />
        </svg>
        <select v-model="groupValue" class="gc-sidebar__select" :disabled="groupsLoading">
          <option :value="null" disabled>选择群组...</option>
          <option v-for="g in groups" :key="g.groupId" :value="g.groupId">
            {{ g.groupName }} · {{ g.relation === 'OWNER' ? '管理员' : '成员' }}
          </option>
        </select>
      </div>
    </div>

    <!-- New chat button -->
    <button class="gc-sidebar__new-chat" type="button" @click="emit('new-chat')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span>新建图谱问答</span>
    </button>

    <!-- Session list -->
    <div class="gc-sidebar__history">
      <div class="gc-sidebar__history-head">
        <span class="gc-sidebar__history-label">当前会话</span>
        <span class="gc-sidebar__history-count">{{ sessions.length }}</span>
      </div>

      <ul v-if="sessions.length > 0" class="gc-sidebar__list">
        <li v-for="s in sessions" :key="s.id">
          <div
            class="gc-sidebar__item"
            :class="{ 'is-active': s.id === activeSessionId }"
            role="button"
            tabindex="0"
            @click="emit('select-session', s.id)"
            @keydown.enter="emit('select-session', s.id)"
            @keydown.space.prevent="emit('select-session', s.id)"
          >
            <span class="gc-sidebar__item-bar" />
            <div class="gc-sidebar__item-body">
              <span class="gc-sidebar__item-title" :title="s.title">{{ s.title }}</span>
              <span class="gc-sidebar__item-meta">
                <span class="gc-sidebar__item-group">{{ s.groupName || '未指定' }}</span>
                <span class="gc-sidebar__item-dot">·</span>
                <span class="gc-sidebar__item-time">{{ formatRelative(s.updatedAt) }}</span>
              </span>
            </div>
            <button
              class="gc-sidebar__item-del"
              title="删除会话"
              type="button"
              @click.stop="emit('delete-session', s.id)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          </div>
        </li>
      </ul>

      <div v-else class="gc-sidebar__empty">
        <p>暂无会话</p>
        <small>提问后会自动创建会话，本页刷新后清空</small>
      </div>
    </div>

    <!-- Footer note -->
    <div class="gc-sidebar__footer">
      <div class="gc-sidebar__note">
        <span class="gc-sidebar__note-dot" />
        会话仅存于当前页面
      </div>
    </div>
  </aside>
</template>

<style scoped>
.gc-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fbfaf6;
  border-right: 1px solid var(--border-default);
  padding: 22px 18px 16px;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.gc-sidebar::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, rgba(139, 92, 246, 0.15), transparent);
}

/* Brand */
.gc-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px dashed var(--border-default);
}

.gc-sidebar__brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8b5cf6, #4A90D9);
  color: #fff;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);
  flex-shrink: 0;
}

.gc-sidebar__brand-mark svg {
  width: 18px;
  height: 18px;
}

.gc-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.gc-sidebar__brand-eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.gc-sidebar__brand-title {
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* Section */
.gc-sidebar__section {
  margin-bottom: 14px;
}

.gc-sidebar__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Poppins', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 7px;
  padding: 0 4px;
}

.gc-sidebar__label-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.gc-sidebar__picker {
  position: relative;
  display: flex;
  align-items: center;
}

.gc-sidebar__picker-icon {
  position: absolute;
  left: 11px;
  color: var(--text-muted);
  pointer-events: none;
}

.gc-sidebar__select {
  width: 100%;
  padding: 9px 30px 9px 32px;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--text-primary);
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  outline: none;
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: all 0.18s ease;
}

.gc-sidebar__select:hover:not(:disabled) {
  border-color: #8b5cf6;
}

.gc-sidebar__select:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
}

.gc-sidebar__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* New chat */
.gc-sidebar__new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  padding: 10px 14px;
  margin-bottom: 18px;
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
  transition: all 0.2s ease;
}

.gc-sidebar__new-chat:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
}

.gc-sidebar__new-chat:active {
  transform: translateY(0);
}

/* History */
.gc-sidebar__history {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gc-sidebar__history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  margin-bottom: 8px;
}

.gc-sidebar__history-label {
  font-family: 'Poppins', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.gc-sidebar__history-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(148, 163, 184, 0.12);
  padding: 1px 7px;
  border-radius: 100px;
}

.gc-sidebar__list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: var(--border-default) transparent;
}

.gc-sidebar__list::-webkit-scrollbar {
  width: 4px;
}

.gc-sidebar__list::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 2px;
}

.gc-sidebar__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px 9px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s ease;
}

.gc-sidebar__item:hover {
  background: rgba(139, 92, 246, 0.06);
}

.gc-sidebar__item.is-active {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.gc-sidebar__item-bar {
  width: 3px;
  height: 28px;
  border-radius: 2px;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.gc-sidebar__item.is-active .gc-sidebar__item-bar {
  background: linear-gradient(to bottom, #8b5cf6, #4A90D9);
}

.gc-sidebar__item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gc-sidebar__item-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gc-sidebar__item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--text-muted);
  overflow: hidden;
}

.gc-sidebar__item-group {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.gc-sidebar__item-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  flex-shrink: 0;
}

.gc-sidebar__item-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.gc-sidebar__item:hover .gc-sidebar__item-del,
.gc-sidebar__item.is-active .gc-sidebar__item-del {
  opacity: 1;
}

.gc-sidebar__item-del:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Empty */
.gc-sidebar__empty {
  padding: 20px 12px;
  text-align: center;
  border: 1px dashed var(--border-default);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
}

.gc-sidebar__empty p {
  margin: 0 0 4px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.gc-sidebar__empty small {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Footer */
.gc-sidebar__footer {
  padding-top: 14px;
  border-top: 1px dashed var(--border-default);
  margin-top: 10px;
}

.gc-sidebar__note {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.72rem;
  color: var(--text-muted);
  padding: 0 4px;
}

.gc-sidebar__note-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8b5cf6;
}
</style>
