<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeaderHero from '@/components/layout/PageHeaderHero.vue'
import { useRagStore } from '@/store/modules/rag'
import { fetchGroups } from '@/api/rag/group'
import {
  fetchGraphOverview,
  fetchSubgraph,
  searchGraph,
  type GraphNode,
  type GraphVisualization
} from '@/api/rag/graph'
import { extractErrorMessage } from '@/utils/request'
import GraphCanvas from '../components/GraphCanvas.vue'
import EntityDetailDrawer from '../components/EntityDetailDrawer.vue'

defineOptions({ name: 'GraphExplorerView' })

const route = useRoute()
const appStore = useRagStore()

// ── 群组 ──
const groupsLoading = ref(false)
const selectedGroupId = ref<number | null>(appStore.currentGroupId)

// ── 图谱数据 ──
const graphLoading = ref(false)
const graph = ref<GraphVisualization | null>(null)
const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const layout = ref<'force' | 'center' | 'circle'>('force')

// ── 搜索 ──
const searchText = ref('')
const searched = ref(false)

// ── 实体详情抽屉 ──
const drawerVisible = ref(false)
const drawerEntityName = ref<string | null>(null)

const nodeCount = computed(() => graph.value?.nodes.length ?? 0)
const edgeCount = computed(() => graph.value?.edges.length ?? 0)
const durationText = computed(() => {
  const ms = graph.value?.durationMs ?? 0
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
})

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

async function loadOverview() {
  if (selectedGroupId.value === null) return
  graphLoading.value = true
  searched.value = false
  try {
    graph.value = await fetchGraphOverview(selectedGroupId.value, 150)
  } catch (error) {
    ElMessage.error(await extractErrorMessage(error) || '加载图谱失败')
    graph.value = null
  } finally {
    graphLoading.value = false
  }
}

async function handleSearch() {
  const query = searchText.value.trim()
  if (selectedGroupId.value === null) return
  if (!query) {
    loadOverview()
    return
  }
  graphLoading.value = true
  try {
    // 优先按问题检索（实体识别 + 多跳遍历）；无命中时回退为实体名子图
    const result = await searchGraph(selectedGroupId.value, query)
    if (result.nodes.length === 0) {
      const fallback = await fetchSubgraph(selectedGroupId.value, query, 1)
      graph.value = fallback
      if (fallback.nodes.length === 0) {
        ElMessage.warning('知识图谱中未找到相关内容')
      }
    } else {
      graph.value = result
    }
    searched.value = true
  } catch (error) {
    ElMessage.error(await extractErrorMessage(error) || '检索失败')
  } finally {
    graphLoading.value = false
  }
}

function handleReset() {
  searchText.value = ''
  loadOverview()
}

/** 双击节点：扩展其一跳邻居 */
async function handleNodeDblClick(node: GraphNode) {
  if (selectedGroupId.value === null) return
  try {
    const sub = await fetchSubgraph(selectedGroupId.value, node.id, 1)
    if (sub.nodes.length > 0) {
      canvasRef.value?.appendGraph(sub)
      // 同步到本地数据，保证统计准确
      mergeIntoGraph(sub)
    }
  } catch (error) {
    ElMessage.error(await extractErrorMessage(error) || '扩展节点失败')
  }
}

function mergeIntoGraph(sub: GraphVisualization) {
  if (!graph.value) {
    graph.value = sub
    return
  }
  const nodeIds = new Set(graph.value.nodes.map((n) => n.id))
  const edgeKeys = new Set(graph.value.edges.map((e) => `${e.source}->${e.target}:${e.relation}`))
  const nodes = [...graph.value.nodes, ...sub.nodes.filter((n) => !nodeIds.has(n.id))]
  const edges = [
    ...graph.value.edges,
    ...sub.edges.filter((e) => !edgeKeys.has(`${e.source}->${e.target}:${e.relation}`))
  ]
  graph.value = { nodes, edges, durationMs: graph.value.durationMs + sub.durationMs }
}

function handleNodeClick(node: GraphNode) {
  drawerEntityName.value = node.id
  drawerVisible.value = true
}

function handleLocate(entityName: string) {
  drawerVisible.value = false
  canvasRef.value?.focusNode(entityName)
}

function handleExport() {
  canvasRef.value?.exportImage(`knowledge-graph-${Date.now()}.png`)
}

/** 用户通过下拉框切换群组时触发 */
function handleGroupChange() {
  appStore.setCurrentGroupId(selectedGroupId.value)
  if (selectedGroupId.value !== null) {
    loadOverview()
  }
}

onMounted(async () => {
  // 1. 确保群组已加载
  if (appStore.visibleGroups.length === 0) {
    await loadGroups()
  }
  // 2. 确保有选中的群组（loadGroups 内部可能已设置，此处兜底）
  if (
    selectedGroupId.value === null ||
    !appStore.visibleGroups.some((g) => g.groupId === selectedGroupId.value)
  ) {
    selectedGroupId.value = appStore.currentGroupId ?? appStore.visibleGroups[0]?.groupId ?? null
  }

  // 3. 加载数据（支持从溯源弹窗携带 ?entity= 跳转）
  const entity = typeof route.query.entity === 'string' ? route.query.entity : ''
  if (entity && selectedGroupId.value !== null) {
    searchText.value = entity
    graphLoading.value = true
    try {
      graph.value = await fetchSubgraph(selectedGroupId.value, entity, 1)
      searched.value = true
    } catch (error) {
      ElMessage.error(await extractErrorMessage(error) || '加载失败')
    } finally {
      graphLoading.value = false
    }
  } else if (selectedGroupId.value !== null) {
    await loadOverview()
  }
})
</script>

<template>
  <div class="graph-explorer">
    <PageHeaderHero
      eyebrow="KNOWLEDGE GRAPH"
      title="图谱总览"
      description="以可视化方式探索知识图谱中的实体与关系，双击节点可扩展其邻居。"
    />

    <div class="graph-explorer__toolbar">
      <el-select
        v-model="selectedGroupId"
        :loading="groupsLoading"
        placeholder="选择知识库群组"
        class="graph-explorer__group-select"
        @change="handleGroupChange"
      >
        <el-option
          v-for="group in appStore.visibleGroups"
          :key="group.groupId"
          :label="group.groupName"
          :value="group.groupId"
        />
      </el-select>

      <el-input
        v-model="searchText"
        class="graph-explorer__search"
        placeholder="输入问题或实体名，检索相关图谱"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span class="graph-explorer__search-icon">⌕</span>
        </template>
      </el-input>

      <el-button type="primary" round :loading="graphLoading" @click="handleSearch">检索</el-button>
      <el-button round :disabled="!searched" @click="handleReset">重置</el-button>

      <div class="graph-explorer__toolbar-right">
        <el-radio-group v-model="layout" size="small">
          <el-radio-button value="force">力导向</el-radio-button>
          <el-radio-button value="center">径向</el-radio-button>
          <el-radio-button value="circle">环形</el-radio-button>
        </el-radio-group>
        <el-button size="small" round @click="handleExport">导出图片</el-button>
      </div>
    </div>

    <div class="graph-explorer__stage" v-loading="graphLoading" element-loading-text="正在加载知识图谱…">
      <div v-if="graph && graph.nodes.length > 0" class="graph-explorer__stats">
        <span class="graph-explorer__stat">
          <i class="graph-explorer__dot graph-explorer__dot--matched" />命中实体
        </span>
        <span class="graph-explorer__stat">
          <i class="graph-explorer__dot graph-explorer__dot--related" />关联实体
        </span>
        <span class="graph-explorer__divider" />
        <span>{{ nodeCount }} 节点</span>
        <span>{{ edgeCount }} 关系</span>
        <span>耗时 {{ durationText }}</span>
        <span class="graph-explorer__hint">单击节点查看详情 · 双击扩展邻居</span>
      </div>
      <GraphCanvas
        ref="canvasRef"
        :graph="graph"
        :layout="layout"
        @node-click="handleNodeClick"
        @node-dblclick="handleNodeDblClick"
      />
      <div v-if="!graphLoading && (!graph || graph.nodes.length === 0)" class="graph-explorer__empty">
        <el-empty
          :description="selectedGroupId === null ? '请先选择知识库群组' : '当前群组暂无图谱数据，请先上传并处理文档'"
          :image-size="110"
        />
      </div>
    </div>

    <EntityDetailDrawer
      v-model="drawerVisible"
      :group-id="selectedGroupId"
      :entity-name="drawerEntityName"
      @locate="handleLocate"
    />
  </div>
</template>

<style scoped>
.graph-explorer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  padding: 0 24px 24px;
}

.graph-explorer__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.graph-explorer__group-select {
  width: 200px;
}

.graph-explorer__search {
  width: 320px;
}

.graph-explorer__search-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.graph-explorer__toolbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.graph-explorer__stage {
  position: relative;
  flex: 1;
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.graph-explorer__stage :deep(.graph-canvas) {
  flex: 1;
}

.graph-explorer__stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.07);
  font-size: 0.74rem;
  color: var(--text-secondary);
}

.graph-explorer__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.graph-explorer__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.graph-explorer__dot--matched {
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.graph-explorer__dot--related {
  background: #8b5cf6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.13);
}

.graph-explorer__divider {
  width: 1px;
  height: 14px;
  background: rgba(15, 23, 42, 0.1);
}

.graph-explorer__hint {
  margin-left: auto;
  color: var(--text-muted);
}

.graph-explorer__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--surface-white);
  border: 1px dashed rgba(15, 23, 42, 0.12);
  z-index: 1;
}
</style>
