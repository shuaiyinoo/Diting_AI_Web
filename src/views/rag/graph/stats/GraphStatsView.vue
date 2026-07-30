<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import PageHeaderHero from '@/components/layout/PageHeaderHero.vue'
import { useRagStore } from '@/store/modules/rag'
import { fetchGroups } from '@/api/rag/group'
import { fetchGraphStatistics, type GraphStatistics } from '@/api/rag/graph'
import { extractErrorMessage } from '@/utils/request'

defineOptions({ name: 'GraphStatsView' })

const appStore = useRagStore()

const groupsLoading = ref(false)
const selectedGroupId = ref<number | null>(appStore.currentGroupId)

const loading = ref(false)
const stats = ref<GraphStatistics | null>(null)

const entityTypeChartRef = ref<HTMLElement | null>(null)
const relationTypeChartRef = ref<HTMLElement | null>(null)
const topEntityChartRef = ref<HTMLElement | null>(null)

let entityTypeChart: echarts.ECharts | null = null
let relationTypeChart: echarts.ECharts | null = null
let topEntityChart: echarts.ECharts | null = null

const CHART_COLORS = [
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

const typeCount = computed(() => stats.value?.entityTypes.length ?? 0)

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

async function loadStatistics() {
  if (selectedGroupId.value === null) return
  loading.value = true
  try {
    stats.value = await fetchGraphStatistics(selectedGroupId.value)
    renderCharts()
  } catch (error) {
    ElMessage.error(extractErrorMessage(error))
    stats.value = null
  } finally {
    loading.value = false
  }
}

function baseTooltip(): Record<string, unknown> {
  return {
    trigger: 'item',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: 'rgba(74,144,217,0.2)',
    textStyle: { color: '#1e293b', fontSize: 12 }
  }
}

function renderCharts() {
  if (!stats.value) return

  // 实体类型分布（环形图）
  if (entityTypeChartRef.value) {
    entityTypeChart ??= echarts.init(entityTypeChartRef.value)
    entityTypeChart.setOption({
      color: CHART_COLORS,
      tooltip: baseTooltip(),
      legend: {
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#64748b' },
        type: 'scroll'
      },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 13, fontWeight: 600 } },
          data: stats.value.entityTypes.map((item) => ({ name: item.type, value: item.count }))
        }
      ]
    })
  }

  // 关系类型分布（横向条形图）
  if (relationTypeChartRef.value) {
    relationTypeChart ??= echarts.init(relationTypeChartRef.value)
    const data = [...stats.value.relationTypes].sort((a, b) => a.count - b.count).slice(-12)
    relationTypeChart.setOption({
      tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 30, top: 10, bottom: 6, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      yAxis: {
        type: 'category',
        data: data.map((item) => item.type),
        axisLabel: { color: '#475569', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [
        {
          type: 'bar',
          data: data.map((item) => item.count),
          barWidth: 12,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#4A90D9' },
              { offset: 1, color: '#8b5cf6' }
            ])
          },
          label: { show: true, position: 'right', color: '#64748b', fontSize: 11 }
        }
      ]
    })
  }

  // Top 实体（柱状图）
  if (topEntityChartRef.value) {
    topEntityChart ??= echarts.init(topEntityChartRef.value)
    topEntityChart.setOption({
      color: CHART_COLORS,
      tooltip: { ...baseTooltip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 16, top: 24, bottom: 6, containLabel: true },
      xAxis: {
        type: 'category',
        data: stats.value.topEntities.map((item) => item.name),
        axisLabel: {
          color: '#475569',
          fontSize: 11,
          interval: 0,
          rotate: stats.value.topEntities.length > 6 ? 24 : 0,
          formatter: (value: string) => (value.length > 10 ? `${value.slice(0, 10)}…` : value)
        },
        axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } }
      },
      yAxis: {
        type: 'value',
        name: '提及次数',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 }
      },
      series: [
        {
          type: 'bar',
          data: stats.value.topEntities.map((item) => item.mentionCount),
          barWidth: 22,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#14b8a6' },
              { offset: 1, color: 'rgba(20,184,166,0.35)' }
            ])
          }
        }
      ]
    })
  }
}

function handleResize() {
  entityTypeChart?.resize()
  relationTypeChart?.resize()
  topEntityChart?.resize()
}

/** 用户通过下拉框切换群组时触发 */
function handleGroupChange() {
  appStore.setCurrentGroupId(selectedGroupId.value)
  if (selectedGroupId.value !== null) {
    loadStatistics()
  }
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  // 1. 确保群组已加载
  if (appStore.visibleGroups.length === 0) {
    await loadGroups()
  }
  // 2. 确保有选中的群组
  if (
    selectedGroupId.value === null ||
    !appStore.visibleGroups.some((g) => g.groupId === selectedGroupId.value)
  ) {
    selectedGroupId.value = appStore.currentGroupId ?? appStore.visibleGroups[0]?.groupId ?? null
  }
  // 3. 加载统计
  if (selectedGroupId.value !== null) {
    await loadStatistics()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  entityTypeChart?.dispose()
  relationTypeChart?.dispose()
  topEntityChart?.dispose()
  entityTypeChart = null
  relationTypeChart = null
  topEntityChart = null
})
</script>

<template>
  <div class="graph-stats">
    <PageHeaderHero
      eyebrow="KNOWLEDGE GRAPH"
      title="图谱统计"
      description="知识图谱的规模与结构概览：实体、关系、切片与类型分布。"
    >
      <template #actions>
        <el-select
          v-model="selectedGroupId"
          :loading="groupsLoading"
          placeholder="选择知识库群组"
          class="graph-stats__group-select"
          @change="handleGroupChange"
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

    <div v-loading="loading">
      <!-- 统计卡片 -->
      <div class="graph-stats__cards">
        <div class="stat-card stat-card--blue">
          <p class="stat-card__label">实体总数</p>
          <p class="stat-card__value">{{ stats?.entityCount ?? '—' }}</p>
          <p class="stat-card__foot">ENTITIES</p>
        </div>
        <div class="stat-card stat-card--purple">
          <p class="stat-card__label">关系总数</p>
          <p class="stat-card__value">{{ stats?.relationCount ?? '—' }}</p>
          <p class="stat-card__foot">RELATIONS</p>
        </div>
        <div class="stat-card stat-card--teal">
          <p class="stat-card__label">切片总数</p>
          <p class="stat-card__value">{{ stats?.chunkCount ?? '—' }}</p>
          <p class="stat-card__foot">CHUNKS</p>
        </div>
        <div class="stat-card stat-card--amber">
          <p class="stat-card__label">实体类型</p>
          <p class="stat-card__value">{{ stats ? typeCount : '—' }}</p>
          <p class="stat-card__foot">TYPES</p>
        </div>
      </div>

      <!-- 图表 -->
      <div class="graph-stats__charts">
        <div class="chart-card">
          <h4 class="chart-card__title">实体类型分布</h4>
          <div ref="entityTypeChartRef" class="chart-card__body" />
        </div>
        <div class="chart-card">
          <h4 class="chart-card__title">关系类型分布</h4>
          <div ref="relationTypeChartRef" class="chart-card__body" />
        </div>
        <div class="chart-card chart-card--wide">
          <h4 class="chart-card__title">热门实体 Top 10</h4>
          <div ref="topEntityChartRef" class="chart-card__body" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-stats {
  padding: 0 24px 24px;
}

.graph-stats__group-select {
  width: 200px;
}

.graph-stats__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 18px 18px 14px;
  border-radius: 14px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.07);
}

.stat-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 4px 0 0 4px;
}

.stat-card--blue::before {
  background: linear-gradient(180deg, #4a90d9, #7ab8f5);
}

.stat-card--purple::before {
  background: linear-gradient(180deg, #8b5cf6, #c4b5fd);
}

.stat-card--teal::before {
  background: linear-gradient(180deg, #14b8a6, #5eead4);
}

.stat-card--amber::before {
  background: linear-gradient(180deg, #f59e0b, #fcd34d);
}

.stat-card__label {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.stat-card__value {
  margin: 0;
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 1.9rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.15;
}

.stat-card__foot {
  margin: 6px 0 0;
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.graph-stats__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.chart-card {
  padding: 16px 16px 10px;
  border-radius: 14px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.07);
}

.chart-card--wide {
  grid-column: 1 / -1;
}

.chart-card__title {
  margin: 0 0 8px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.chart-card__body {
  height: 300px;
}

.chart-card--wide .chart-card__body {
  height: 280px;
}

@media (max-width: 1100px) {
  .graph-stats__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .graph-stats__charts {
    grid-template-columns: 1fr;
  }
}
</style>
