<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { TopologyGraph, Minimap, GraphToolbar } from 'topology-graph-vue'
import 'topology-graph-vue/style.css'
import type { GraphVisualization } from '@/api/rag/graph'

const props = withDefaults(
  defineProps<{
    /** 图谱数据（null 表示清空画布） */
    graph: GraphVisualization | null
    /** 布局类型 */
    layout?: 'force' | 'center' | 'circle'
    /** 是否显示小地图 */
    minimap?: boolean
    /** 是否显示工具栏 */
    toolbar?: boolean
  }>(),
  {
    layout: 'force',
    minimap: true,
    toolbar: true
  }
)

const emit = defineEmits<{
  (e: 'node-click', node: import('@/api/rag/graph').GraphNode): void
  (e: 'node-dblclick', node: import('@/api/rag/graph').GraphNode): void
  (e: 'ready'): void
}>()

/** 实体类型配色（明亮科技风） */
const TYPE_PALETTE = [
  '#4A90D9',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#22c55e',
  '#f97316',
  '#06b6d4',
  '#a855f7',
  '#84cc16'
]
/** 命中实体强调色 */
const MATCHED_COLOR = '#2563eb'
const MATCHED_BORDER = '#93c5fd'
const EDGE_COLOR = '#b6c2d2'

const graphApi = ref<any>(null)
const destroyed = ref(false)

/** 类型 → 颜色（稳定哈希） */
function colorOfType(type: string | null | undefined): string {
  if (!type) return TYPE_PALETTE[0]
  let hash = 0
  for (let i = 0; i < type.length; i++) {
    hash = (hash * 31 + type.charCodeAt(i)) >>> 0
  }
  return TYPE_PALETTE[hash % TYPE_PALETTE.length]
}

function toCanvasData(vis: GraphVisualization) {
  // 收集所有节点 ID，用于过滤引用了不存在节点的边
  const nodeIds = new Set(vis.nodes.map((n) => n.id))

  // 按 source + target + relation 去重，保留置信度最高的边
  const edgeMap = new Map<string, GraphVisualization['edges'][number]>()
  for (const edge of vis.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    const key = `${edge.source}|${edge.target}|${edge.relation}`
    const existing = edgeMap.get(key)
    if (!existing || edge.confidence > existing.confidence) {
      edgeMap.set(key, edge)
    }
  }

  return {
    nodes: vis.nodes.map((node) => {
      const matched = node.category === 'matched'
      const radius = Math.min(34, 20 + Math.min(node.mentionCount ?? 0, 14) * 1.2)
      return {
        id: node.id,
        text: node.name,
        color: matched ? MATCHED_COLOR : colorOfType(node.type),
        radius,
        borderColor: matched ? MATCHED_BORDER : 'rgba(255,255,255,0.9)',
        borderWidth: matched ? 3 : 1.5,
        forceDetail: true,
        data: node
      }
    }),
    lines: [...edgeMap.values()].map((edge) => ({
      id: `${edge.source}->${edge.target}:${edge.relation}`,
      from: edge.source,
      to: edge.target,
      text: edge.relation,
      color: EDGE_COLOR,
      fontColor: '#7d8ca3',
      showEndArrow: true,
      curve: 'bezier',
      forceDetail: true,
      data: edge
    }))
  }
}

function currentLayout() {
  return props.layout === 'center' ? 'center' : props.layout
}

function applyCurrentLayout() {
  const api = graphApi.value
  if (!api) return
  const type = currentLayout()
  if (type === 'force') {
    api.applyLayout({ type: 'force', repulsion: 4200, springLength: 130, springK: 0.08, damping: 0.35, iterations: 260 })
  } else {
    api.applyLayout({ type })
  }
  window.setTimeout(() => {
    if (!destroyed.value) graphApi.value?.fitView()
  }, 380)
}

function renderGraph(vis: GraphVisualization | null, append = false) {
  const api = graphApi.value
  if (!api || destroyed.value) return
  if (!vis || vis.nodes.length === 0) {
    if (!append) api.setJsonData({ nodes: [], lines: [] })
    return
  }
  api.setJsonData(toCanvasData(vis), append)
  applyCurrentLayout()
}

function onReady(api: any) {
  graphApi.value = api
  api.setOptions({
    theme: 'light',
    hoverNodeHighlight: true,
    hoverNodeLineHighlight: true,
    clickNodeHighlight: true,
    clickNodeLineHighlight: true,
    // 自定义 LOD 阶梯表：所有缩放级别均使用 detail 模式，确保连线+文字始终完整渲染
    lodTiers: [
      {
        minScale: 0,
        nodeMode: 'detail' as const,
        lineMode: 'detail' as const,
        nodeDowngradeThreshold: 100000,
        lineDowngradeThreshold: 100000
      }
    ],
    // 文字标签在所有缩放级别下显示
    perfConfig: { nodeTextMinScale: 0, lineTextMinScale: 0, hoverColorMinScale: 0 }
  })
  // 等待 DOM 更新完成，确保 PixiJS 画布已获得正确的容器尺寸后再渲染数据
  nextTick(() => {
    if (!destroyed.value) {
      renderGraph(props.graph)
    }
  })
  emit('ready')
}

function handleNodeClick(node: any) {
  if (node?.data) emit('node-click', node.data)
}

function handleNodeDblClick(node: any) {
  if (node?.data) emit('node-dblclick', node.data)
}

watch(
  () => props.graph,
  (vis) => renderGraph(vis),
  { deep: false }
)

watch(
  () => props.layout,
  () => applyCurrentLayout()
)

onBeforeUnmount(() => {
  destroyed.value = true
  graphApi.value = null
})

defineExpose({
  /** 追加子图数据（用于节点扩展） */
  appendGraph(vis: GraphVisualization) {
    renderGraph(vis, true)
  },
  /** 聚焦到指定节点 */
  focusNode(name: string) {
    const api = graphApi.value
    if (!api) return
    api.focusOnNode(name)
    api.flashNode(name, 800)
  },
  /** 自适应视图 */
  fitView() {
    graphApi.value?.fitView()
  },
  /** 切换布局 */
  relayout() {
    applyCurrentLayout()
  },
  /** 导出当前视口为图片 */
  exportImage(filename = 'knowledge-graph.png') {
    return graphApi.value?.downloadAsImage(filename, { format: 'image/png', scale: 2 })
  }
})
</script>

<template>
  <div class="graph-canvas">
    <TopologyGraph
      @ready="onReady"
      @node-click="handleNodeClick"
      @node-dblclick="handleNodeDblClick"
    >
      <GraphToolbar v-if="toolbar" position="top-right" direction="vertical" />
      <Minimap v-if="minimap" position="right-bottom" :width="168" :height="118" />
    </TopologyGraph>
    <div class="graph-canvas__grid" aria-hidden="true" />
  </div>
</template>

<style scoped>
.graph-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: 14px;
  overflow: hidden;
  background:
    radial-gradient(1200px 500px at 80% -10%, rgba(74, 144, 217, 0.08), transparent 60%),
    radial-gradient(900px 420px at 10% 110%, rgba(139, 92, 246, 0.07), transparent 55%),
    linear-gradient(180deg, #fbfdff 0%, #f6f9fd 100%);
  border: 1px solid rgba(74, 144, 217, 0.14);
}

.graph-canvas__grid {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(74, 144, 217, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 144, 217, 0.05) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: radial-gradient(closest-side at 50% 50%, rgba(0, 0, 0, 0.7), transparent);
}
</style>
