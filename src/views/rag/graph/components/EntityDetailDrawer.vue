<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchEntityDetail, type EntityDetail } from '@/api/rag/graph'
import { extractErrorMessage } from '@/utils/request'

const props = defineProps<{
  modelValue: boolean
  groupId: number | null
  entityName: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** 请求在图谱中定位某个实体 */
  (e: 'locate', entityName: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = ref(false)
const detail = ref<EntityDetail | null>(null)
const errorMessage = ref('')

async function loadDetail() {
  if (props.groupId === null || !props.entityName) return
  loading.value = true
  errorMessage.value = ''
  detail.value = null
  try {
    detail.value = await fetchEntityDetail(props.groupId, props.entityName)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.entityName, props.groupId],
  ([open]) => {
    if (open) loadDetail()
  }
)

function directionLabel(direction: string): string {
  return direction === 'OUTGOING' ? '指向' : '被引'
}

function formatConfidence(value: number): string {
  if (!Number.isFinite(value)) return '--'
  return `${Math.round(value * 100)}%`
}
</script>

<template>
  <el-drawer
    v-model="visible"
    size="440px"
    :with-header="false"
    class="entity-drawer"
    destroy-on-close
  >
    <div v-loading="loading" class="entity-drawer__body">
      <template v-if="detail">
        <header class="entity-drawer__header">
          <p class="entity-drawer__eyebrow">ENTITY</p>
          <h3 class="entity-drawer__name">{{ detail.name }}</h3>
          <div class="entity-drawer__tags">
            <el-tag size="small" effect="light" round>{{ detail.type }}</el-tag>
            <span class="entity-drawer__mention">被提及 {{ detail.mentionCount }} 次</span>
          </div>
          <p v-if="detail.description" class="entity-drawer__desc">{{ detail.description }}</p>
          <el-button
            class="entity-drawer__locate"
            size="small"
            type="primary"
            plain
            round
            @click="emit('locate', detail.name)"
          >
            在图谱中定位
          </el-button>
        </header>

        <section class="entity-drawer__section">
          <h4 class="entity-drawer__section-title">关联关系（{{ detail.relations.length }}）</h4>
          <el-empty v-if="detail.relations.length === 0" description="暂无关联关系" :image-size="60" />
          <ul v-else class="relation-list">
            <li v-for="(rel, index) in detail.relations" :key="index" class="relation-item">
              <span class="relation-item__direction" :class="{ 'is-incoming': rel.direction === 'INCOMING' }">
                {{ directionLabel(rel.direction) }}
              </span>
              <div class="relation-item__main">
                <span class="relation-item__peer" :title="rel.peerName">{{ rel.peerName }}</span>
                <span class="relation-item__type">{{ rel.peerType }}</span>
              </div>
              <span class="relation-item__relation" :title="rel.relation">{{ rel.relation }}</span>
              <span class="relation-item__confidence">{{ formatConfidence(rel.confidence) }}</span>
            </li>
          </ul>
        </section>

        <section class="entity-drawer__section">
          <h4 class="entity-drawer__section-title">提及切片（{{ detail.mentionedChunks.length }}）</h4>
          <el-empty v-if="detail.mentionedChunks.length === 0" description="暂无提及切片" :image-size="60" />
          <ul v-else class="chunk-list">
            <li v-for="chunk in detail.mentionedChunks" :key="`${chunk.chunkId}-${chunk.chunkIndex}`" class="chunk-item">
              <div class="chunk-item__head">
                <span class="chunk-item__file" :title="chunk.fileName ?? undefined">
                  {{ chunk.fileName ?? `文档 #${chunk.documentId ?? '--'}` }}
                </span>
                <code class="chunk-item__index">#{{ chunk.chunkIndex ?? '--' }}</code>
              </div>
              <p class="chunk-item__snippet">{{ chunk.snippet || '暂无摘要' }}</p>
            </li>
          </ul>
        </section>
      </template>

      <el-result v-else-if="errorMessage" icon="error" :title="errorMessage" />
      <el-empty v-else-if="!loading" description="未找到实体详情" />
    </div>
  </el-drawer>
</template>

<style scoped>
.entity-drawer__body {
  min-height: 100%;
  padding: 4px 2px;
}

.entity-drawer__header {
  padding: 18px 18px 16px;
  border-radius: 12px;
  background:
    radial-gradient(400px 120px at 90% 0%, rgba(139, 92, 246, 0.10), transparent 60%),
    linear-gradient(135deg, rgba(74, 144, 217, 0.10), rgba(74, 144, 217, 0.02));
  border: 1px solid rgba(74, 144, 217, 0.16);
}

.entity-drawer__eyebrow {
  margin: 0 0 4px;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--brand-primary-dark);
}

.entity-drawer__name {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-all;
}

.entity-drawer__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.entity-drawer__mention {
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.entity-drawer__desc {
  margin: 0 0 10px;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.entity-drawer__section {
  margin-top: 18px;
}

.entity-drawer__section-title {
  margin: 0 0 10px;
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--text-primary);
}

.relation-list,
.chunk-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.relation-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'direction main confidence'
    'direction relation confidence';
  align-items: center;
  column-gap: 10px;
  row-gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.07);
}

.relation-item__direction {
  grid-area: direction;
  font-size: 0.68rem;
  font-weight: 700;
  color: #2f6fc2;
  background: rgba(74, 144, 217, 0.10);
  border-radius: 6px;
  padding: 3px 7px;
  white-space: nowrap;
}

.relation-item__direction.is-incoming {
  color: #7c3aed;
  background: rgba(139, 92, 246, 0.10);
}

.relation-item__main {
  grid-area: main;
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.relation-item__peer {
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-item__type {
  font-size: 0.68rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.relation-item__relation {
  grid-area: relation;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.relation-item__confidence {
  grid-area: confidence;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.chunk-item {
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.chunk-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.chunk-item__file {
  font-size: 0.76rem;
  font-weight: 650;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-item__index {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.chunk-item__snippet {
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.55;
  color: var(--text-secondary);
}
</style>
