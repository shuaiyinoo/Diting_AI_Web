<script setup lang="ts">
defineProps<{
  groupName: string
  hasGroup: boolean
}>()

const emit = defineEmits<{
  pick: [prompt: string]
}>()

const starters = [
  {
    title: '实体关系',
    prompt: '核心实体之间有什么关系？',
    icon: 'graph',
  },
  {
    title: '关键概念',
    prompt: '文档中提到了哪些关键概念？',
    icon: 'concept',
  },
  {
    title: '知识脉络',
    prompt: '帮我梳理这个知识库的知识脉络',
    icon: 'network',
  },
  {
    title: '溯源分析',
    prompt: '某个实体在文档中是如何被描述的？它和哪些实体有关联？',
    icon: 'trace',
  },
]
</script>

<template>
  <div class="gc-hero">
    <!-- Decorative mesh background -->
    <div class="gc-hero__mesh" aria-hidden="true">
      <div class="gc-hero__blob gc-hero__blob--a" />
      <div class="gc-hero__blob gc-hero__blob--b" />
      <div class="gc-hero__grid" />
    </div>

    <div class="gc-hero__inner">
      <!-- Eyebrow glyph -->
      <div class="gc-hero__mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="17" r="2.5" />
          <circle cx="19" cy="17" r="2.5" />
          <path d="M11 7.2 6.3 14.8M13 7.2 17.7 14.8M7.2 17h9.6" stroke-dasharray="2 2" />
        </svg>
      </div>

      <p class="gc-hero__eyebrow">Graph RAG · Argus</p>

      <h1 class="gc-hero__title">
        向<span class="gc-hero__title-accent">知识图谱</span>提问
      </h1>

      <p class="gc-hero__subtitle">
        实体 · 关系 · 溯源 — 从图谱中识别实体、遍历关系，并结合原文片段生成回答。
      </p>

      <!-- Current context badge -->
      <div v-if="hasGroup" class="gc-hero__context">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v7c0 1.7 4 3 9 3s9-1.3 9-3V5" />
          <path d="M3 12v7c0 1.7 4 3 9 3s9-1.3 9-3v-7" />
        </svg>
        <span>当前知识库：<strong>{{ groupName }}</strong></span>
      </div>
      <div v-else class="gc-hero__context gc-hero__context--warn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>请先在左侧选择一个群组作为知识库范围</span>
      </div>

      <!-- Starter prompts -->
      <div class="gc-hero__starters">
        <button
          v-for="(item, i) in starters"
          :key="item.title"
          class="gc-hero__starter"
          type="button"
          :disabled="!hasGroup"
          :style="{ animationDelay: `${0.08 * i + 0.1}s` }"
          @click="emit('pick', item.prompt)"
        >
          <div class="gc-hero__starter-icon" :class="`gc-hero__starter-icon--${item.icon}`">
            <template v-if="item.icon === 'graph'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2" />
                <circle cx="5" cy="17" r="2" />
                <circle cx="19" cy="17" r="2" />
                <path d="M11 7 6.5 15M13 7 17.5 15M7 17h10" />
              </svg>
            </template>
            <template v-else-if="item.icon === 'concept'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0H5a2 2 0 0 1-2-2v-4m6 6h10a2 2 0 0 0 2-2v-4" />
              </svg>
            </template>
            <template v-else-if="item.icon === 'network'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="2" />
                <circle cx="5" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
                <path d="M10.5 10.5 6.5 6.5M13.5 10.5 17.5 6.5M10.5 13.5 6.5 17.5M13.5 13.5 17.5 17.5" />
              </svg>
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </template>
          </div>
          <div class="gc-hero__starter-body">
            <span class="gc-hero__starter-title">{{ item.title }}</span>
            <span class="gc-hero__starter-prompt">{{ item.prompt }}</span>
          </div>
          <svg class="gc-hero__starter-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gc-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  position: relative;
  overflow: hidden;
  background: #fff;
}

/* Mesh background */
.gc-hero__mesh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.gc-hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
}

.gc-hero__blob--a {
  top: -80px;
  left: 10%;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0) 70%);
}

.gc-hero__blob--b {
  bottom: -100px;
  right: 10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(74, 144, 217, 0.35) 0%, rgba(74, 144, 217, 0) 70%);
}

.gc-hero__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 80%);
}

/* Inner container */
.gc-hero__inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: gc-hero-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes gc-hero-fade {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.gc-hero__mark {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  background: linear-gradient(135deg, #8b5cf6, #4A90D9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow:
    0 10px 28px rgba(139, 92, 246, 0.3),
    0 0 0 8px rgba(139, 92, 246, 0.06);
}

.gc-hero__mark svg {
  width: 28px;
  height: 28px;
}

.gc-hero__eyebrow {
  margin: 0 0 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #8b5cf6;
}

.gc-hero__title {
  margin: 0 0 14px;
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.gc-hero__title-accent {
  background: linear-gradient(135deg, #8b5cf6, #4A90D9);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.gc-hero__subtitle {
  margin: 0 0 22px;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text-secondary);
  max-width: 560px;
}

/* Context */
.gc-hero__context {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  margin-bottom: 36px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 100px;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.gc-hero__context svg {
  color: #8b5cf6;
}

.gc-hero__context strong {
  font-weight: 600;
  color: var(--text-primary);
}

.gc-hero__context--warn {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}

.gc-hero__context--warn svg {
  color: #b45309;
}

/* Starter cards */
.gc-hero__starters {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 680px;
}

.gc-hero__starter {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid var(--border-default);
  border-radius: 14px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  opacity: 0;
  animation: gc-starter-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes gc-starter-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.gc-hero__starter:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: #8b5cf6;
  box-shadow: 0 10px 24px rgba(139, 92, 246, 0.1);
}

.gc-hero__starter:hover:not(:disabled) .gc-hero__starter-arrow {
  color: #8b5cf6;
  transform: translateX(2px);
}

.gc-hero__starter:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gc-hero__starter-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.gc-hero__starter-icon svg {
  width: 17px;
  height: 17px;
}

.gc-hero__starter-icon--concept {
  background: rgba(74, 144, 217, 0.1);
  color: var(--brand-primary);
}

.gc-hero__starter-icon--network {
  background: rgba(20, 184, 166, 0.1);
  color: #0d9488;
}

.gc-hero__starter-icon--trace {
  background: rgba(245, 158, 11, 0.1);
  color: #b45309;
}

.gc-hero__starter-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.gc-hero__starter-title {
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.005em;
}

.gc-hero__starter-prompt {
  font-size: 0.76rem;
  color: var(--text-secondary);
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.gc-hero__starter-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  margin-top: 4px;
  transition: all 0.2s ease;
}

@media (max-width: 720px) {
  .gc-hero__title {
    font-size: 1.8rem;
  }

  .gc-hero__starters {
    grid-template-columns: 1fr;
  }
}
</style>
