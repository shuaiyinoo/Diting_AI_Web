<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  source: string | null | undefined
}>()

interface SourceMeta {
  label: string
  color: string
  bg: string
  border: string
}

const SOURCE_MAP: Record<string, SourceMeta> = {
  VECTOR: {
    label: '向量检索',
    color: '#2f6fc2',
    bg: 'rgba(74, 144, 217, 0.10)',
    border: 'rgba(74, 144, 217, 0.28)'
  },
  KEYWORD: {
    label: '关键词检索',
    color: '#15803d',
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.28)'
  },
  GRAPH: {
    label: '知识图谱',
    color: '#7c3aed',
    bg: 'rgba(139, 92, 246, 0.10)',
    border: 'rgba(139, 92, 246, 0.30)'
  },
  BOTH: {
    label: '多路融合',
    color: '#b45309',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.30)'
  },
  GLOBAL: {
    label: '全局遍历',
    color: '#0f766e',
    bg: 'rgba(20, 184, 166, 0.10)',
    border: 'rgba(20, 184, 166, 0.28)'
  }
}

const meta = computed<SourceMeta>(() => {
  const key = (props.source ?? '').toUpperCase()
  return (
    SOURCE_MAP[key] ?? {
      label: props.source || '未知来源',
      color: '#64748b',
      bg: 'rgba(100, 116, 139, 0.08)',
      border: 'rgba(100, 116, 139, 0.22)'
    }
  )
})

const isGraph = computed(() => (props.source ?? '').toUpperCase() === 'GRAPH')
</script>

<template>
  <span
    class="source-tag"
    :style="{ color: meta.color, background: meta.bg, borderColor: meta.border }"
    :title="`检索来源：${meta.label}`"
  >
    <svg v-if="isGraph" class="source-tag__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="3" r="2" :fill="meta.color" />
      <circle cx="3" cy="12" r="2" :fill="meta.color" />
      <circle cx="13" cy="12" r="2" :fill="meta.color" />
      <path d="M8 5v2.5M6.8 10.6 7.6 8M9.2 10.6 8.4 8" :stroke="meta.color" stroke-width="1.1" />
      <path d="M4.7 10.9 6.9 9.2M11.3 10.9 9.1 9.2" :stroke="meta.color" stroke-width="1.1" />
    </svg>
    <span v-else class="source-tag__dot" :style="{ background: meta.color }" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
}

.source-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.source-tag__icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
