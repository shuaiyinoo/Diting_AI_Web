<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSubgraph, type GraphEdge, type GraphNode, type GraphVisualization } from '@/api/rag/graph'
import { extractErrorMessage } from '@/utils/request'
import GraphCanvas from './GraphCanvas.vue'

const props = defineProps<{
  modelValue: boolean
  groupId: number | null
  /** 需要溯源的实体名列表 */
  entities: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = ref(false)
const errorMessage = ref('')
const graph = ref<GraphVisualization | null>(null)
const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)

/** 溯源实体上限，避免图谱过大 */
const TRACE_ENTITY_LIMIT = 3

async function loadTrace() {
  if (props.groupId === null || props.entities.length === 0) return
  loading.value = true
  errorMessage.value = ''
  graph.value = null
  try {
    const targets = props.entities.slice(0, TRACE_ENTITY_LIMIT)
    const results = await Promise.all(
      targets.map((name) => fetchSubgraph(props.groupId as number, name, 1))
    )
    graph.value = mergeVisualizations(results, targets)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error)
  } finally {
    loading.value = false
  }
}

/** 合并多个实体子图并去重 */
function mergeVisualizations(visualizations: GraphVisualization[], centers: string[]): GraphVisualization {
  const nodeMap = new Map<string, GraphNode>()
  const edgeMap = new Map<string, GraphEdge>()
  let durationMs = 0

  for (const vis of visualizations) {
    durationMs += vis.durationMs
    for (const node of vis.nodes) {
      const existing = nodeMap.get(node.id)
      // 任一子图中为命中实体，则整体视为命中
      if (!existing || (existing.category !== 'matched' && node.category === 'matched')) {
        nodeMap.set(node.id, node)
      }
    }
    for (const edge of vis.edges) {
      edgeMap.set(`${edge.source}->${edge.target}:${edge.relation}`, edge)
    }
  }
  // 确保溯源中心实体被标记为命中
  for (const center of centers) {
    const node = nodeMap.get(center)
    if (node) nodeMap.set(center, { ...node, category: 'matched' })
  }
  return { nodes: [...nodeMap.values()], edges: [...edgeMap.values()], durationMs }
}

function handleNodeClick(node: GraphNode) {
  canvasRef.value?.focusNode(node.id)
}

function openInExplorer() {
  if (props.entities.length === 0) return
  visible.value = false
  router.push({ path: '/graph/explore', query: { entity: props.entities[0] } })
}

watch(
  () => [props.modelValue, props.entities, props.groupId],
  ([open]) => {
    if (open) loadTrace()
  }
)
</script>

<template>
  <el-dialog
    v-model="visible"
    title="图谱溯源"
    width="760px"
    class="trace-dialog"
    destroy-on-close
    append-to-body
  >
    <div class="trace-dialog__meta">
      <span class="trace-dialog__label">溯源实体</span>
      <el-tag
        v-for="entity in entities.slice(0, TRACE_ENTITY_LIMIT)"
        :key="entity"
        size="small"
        effect="light"
        round
        class="trace-dialog__tag"
      >
        {{ entity }}
      </el-tag>
      <span v-if="entities.length > TRACE_ENTITY_LIMIT" class="trace-dialog__more">
        等 {{ entities.length }} 个
      </span>
    </div>

    <div v-loading="loading" class="trace-dialog__canvas">
      <GraphCanvas
        v-if="graph && graph.nodes.length > 0"
        ref="canvasRef"
        :graph="graph"
        :minimap="false"
        :toolbar="false"
        @node-click="handleNodeClick"
      />
      <el-empty
        v-else-if="!loading"
        :description="errorMessage || '知识图谱中未找到相关实体'"
        :image-size="90"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" :disabled="entities.length === 0" @click="openInExplorer">
        在图谱总览中查看
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.trace-dialog__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.trace-dialog__label {
  font-size: 0.76rem;
  color: var(--text-secondary);
  margin-right: 2px;
}

.trace-dialog__more {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.trace-dialog__canvas {
  height: 460px;
  border-radius: 14px;
}
</style>
