<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  fetchMetricsOverview,
  fetchTrend,
  fetchUserRank,
  fetchGroupRank,
  type Period,
  type MetricsOverview,
  type TrendItem,
  type UsageRankItem,
} from '@/api/rag/metrics'
import { extractErrorMessage } from '@/utils/request'
import { ElMessage } from 'element-plus'
import PageHeaderHero from '@/components/layout/PageHeaderHero.vue'

defineOptions({ name: 'MetricsView' })

// ── 时间段选项 ──
const periodOptions: { label: string; value: Period }[] = [
  { label: '今天', value: 'TODAY' },
  { label: '7天', value: 'LAST_7_DAYS' },
  { label: '14天', value: 'LAST_14_DAYS' },
  { label: '30天', value: 'LAST_30_DAYS' },
]

const selectedPeriod = ref<Period>('LAST_7_DAYS')

// ── 数据状态 ──
const overview = ref<MetricsOverview | null>(null)
const trendData = ref<TrendItem[]>([])
const userRank = ref<UsageRankItem[]>([])
const groupRank = ref<UsageRankItem[]>([])

const loadingOverview = ref(false)
const loadingTrend = ref(false)
const loadingRank = ref(false)
const errorMsg = ref('')

// ── ECharts 实例 ──
const trendChartRef = ref<HTMLElement | null>(null)
const userRankChartRef = ref<HTMLElement | null>(null)
const groupRankChartRef = ref<HTMLElement | null>(null)

let trendChart: echarts.ECharts | null = null
let userRankChart: echarts.ECharts | null = null
let groupRankChart: echarts.ECharts | null = null

// ── 格式化工具 ──
// 后端 BigDecimal 字段在 JSON 中可能序列化为字符串，需统一转为 number
function toNum(n: unknown): number {
  const v = Number(n)
  return isNaN(v) ? 0 : v
}

function formatNumber(n: unknown): string {
  return toNum(n).toLocaleString('zh-CN')
}

function formatCost(n: unknown): string {
  return toNum(n).toFixed(4)
}

function formatPercent(n: unknown): string {
  return toNum(n).toFixed(1) + '%'
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[1]}-${parts[2]}`
  return dateStr
}

// ── 用户头像颜色 ──
const AVATAR_COLORS = [
  'linear-gradient(135deg, #f59e0b, #ea580c)',
  'linear-gradient(135deg, #64748b, #475569)',
  'linear-gradient(135deg, #f97316, #ea580c)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #84cc16, #65a30d)',
  'linear-gradient(135deg, #f43f5e, #e11d48)',
]

function getAvatarColor(index: number): string {
  return (AVATAR_COLORS[index % AVATAR_COLORS.length] as string) ?? AVATAR_COLORS[0]!
}

function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase()
}

// ── 排行徽章类型 ──
function getRankBadgeClass(idx: number): string {
  if (idx === 0) return 'rank-badge--gold'
  if (idx === 1) return 'rank-badge--silver'
  if (idx === 2) return 'rank-badge--bronze'
  return ''
}

// ── 是否有趋势数据 ──
const hasTrendData = computed(() => trendData.value.length > 0)

// ── ECharts 渲染 ──
function renderTrendChart() {
  if (!trendChartRef.value) return
  trendChart ??= echarts.init(trendChartRef.value)

  const dates = trendData.value.map((t) => formatDate(t.date))
  const requests = trendData.value.map((t) => toNum(t.requests))
  const tokens = trendData.value.map((t) => toNum(t.tokens))

  trendChart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(74,144,217,0.2)',
      textStyle: { color: '#1e293b', fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: '#999' } },
    },
    legend: {
      data: ['调用量', 'Token 消耗'],
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 12, color: '#64748b' },
    },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(15,23,42,0.12)' } },
    },
    yAxis: [
      {
        type: 'value',
        name: '调用量',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (val: number) => (val >= 10000 ? (val / 1000).toFixed(0) + 'k' : String(val)),
        },
      },
      {
        type: 'value',
        name: 'Token',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { show: false },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 11,
          formatter: (val: number) => (val >= 10000 ? (val / 1000).toFixed(0) + 'k' : String(val)),
        },
      },
    ],
    series: [
      {
        name: '调用量',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: requests,
        itemStyle: { color: '#3b82f6' },
        lineStyle: { width: 2.5, color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59,130,246,0.25)' },
            { offset: 1, color: 'rgba(59,130,246,0.02)' },
          ]),
        },
        emphasis: { focus: 'series' },
      },
      {
        name: 'Token 消耗',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        yAxisIndex: 1,
        data: tokens,
        itemStyle: { color: '#14b8a6' },
        lineStyle: { width: 2.5, color: '#14b8a6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(20,184,166,0.25)' },
            { offset: 1, color: 'rgba(20,184,166,0.02)' },
          ]),
        },
        emphasis: { focus: 'series' },
      },
    ],
  })
}

function renderRankChart(
  chart: echarts.ECharts | null,
  ref: HTMLElement | null,
  data: UsageRankItem[],
  colorFrom: string,
  colorTo: string,
) {
  if (!ref) return
  chart ??= echarts.init(ref)

  const sorted = [...data].sort((a, b) => toNum(a.totalTokens) - toNum(b.totalTokens))
  const names = sorted.map((item) => item.name || '未知')
  const values = sorted.map((item) => toNum(item.totalTokens))

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: 'rgba(74,144,217,0.2)',
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any) => {
        const item = params[0]
        if (!item) return ''
        const original = sorted[item.dataIndex]
        if (!original) return ''
        return `${original.name}<br/>Token: ${formatNumber(original.totalTokens)}<br/>调用: ${formatNumber(original.totalRequests)}<br/>费用: ${formatCost(original.totalCost)}`
      },
    },
    grid: { left: 8, right: 50, top: 8, bottom: 6, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(15,23,42,0.06)' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (val: number) => (val >= 10000 ? (val / 1000).toFixed(0) + 'k' : String(val)),
      },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        color: '#475569',
        fontSize: 11,
        formatter: (val: string) => (val.length > 8 ? val.slice(0, 8) + '…' : val),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colorFrom },
            { offset: 1, color: colorTo },
          ]),
        },
        label: {
          show: true,
          position: 'right',
          color: '#64748b',
          fontSize: 11,
          formatter: (params: any) => {
            const val = params.value as number
            return val >= 10000 ? (val / 1000).toFixed(1) + 'k' : String(val)
          },
        },
      },
    ],
  })
}

function renderUserRankChart() {
  renderRankChart(userRankChart, userRankChartRef.value, userRank.value, '#3b82f6', '#60a5fa')
}

function renderGroupRankChart() {
  renderRankChart(groupRankChart, groupRankChartRef.value, groupRank.value, '#8b5cf6', '#c4b5fd')
}

function renderAllCharts() {
  if (hasTrendData.value) {
    nextTick(() => renderTrendChart())
  }
  if (userRank.value.length > 0) {
    nextTick(() => renderUserRankChart())
  }
  if (groupRank.value.length > 0) {
    nextTick(() => renderGroupRankChart())
  }
}

function handleResize() {
  trendChart?.resize()
  userRankChart?.resize()
  groupRankChart?.resize()
}

// ── 数据加载 ──
async function loadOverview() {
  loadingOverview.value = true
  try {
    overview.value = await fetchMetricsOverview()
  } catch (err) {
    const msg = await extractErrorMessage(err)
    errorMsg.value = msg || '加载概览数据失败'
  } finally {
    loadingOverview.value = false
  }
}

async function loadTrend() {
  loadingTrend.value = true
  try {
    const data = await fetchTrend(selectedPeriod.value)
    trendData.value = data ?? []
    if (trendData.value.length > 0) {
      await nextTick()
      renderTrendChart()
    }
  } catch (err) {
    const msg = await extractErrorMessage(err)
    ElMessage.warning(msg || '加载趋势数据失败')
    trendData.value = []
  } finally {
    loadingTrend.value = false
  }
}

async function loadRanks() {
  loadingRank.value = true
  try {
    const [users, groups] = await Promise.all([
      fetchUserRank(selectedPeriod.value, 10),
      fetchGroupRank(selectedPeriod.value, 10),
    ])
    userRank.value = users ?? []
    groupRank.value = groups ?? []
    await nextTick()
    renderUserRankChart()
    renderGroupRankChart()
  } catch (err) {
    const msg = await extractErrorMessage(err)
    ElMessage.warning(msg || '加载排行数据失败')
  } finally {
    loadingRank.value = false
  }
}

watch(selectedPeriod, () => {
  loadTrend()
  loadRanks()
})

async function refreshAll() {
  errorMsg.value = ''
  await Promise.all([loadOverview(), loadTrend(), loadRanks()])
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadOverview()
  loadTrend()
  loadRanks()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  userRankChart?.dispose()
  groupRankChart?.dispose()
  trendChart = null
  userRankChart = null
  groupRankChart = null
})
</script>

<template>
  <div class="metrics-page">
    <PageHeaderHero
      eyebrow="数据分析"
      title="用量统计"
      description="LLM 调用量、Token 消耗与费用分析"
    >
      <template #actions>
        <button class="action-btn" @click="refreshAll">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </template>
    </PageHeaderHero>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
        <path d="M12 8V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
      </svg>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- ── KPI 卡片 ── -->
    <div v-if="loadingOverview" class="loading-placeholder">
      <div class="skeleton-card" v-for="i in 4" :key="i" />
    </div>
    <div v-else-if="overview" class="kpi-grid">
      <div class="kpi-card kpi-card--blue">
        <div class="kpi-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="kpi-card__label">今日调用次数</div>
        <div class="kpi-card__value">{{ formatNumber(overview.todayRequests) }}</div>
      </div>
      <div class="kpi-card kpi-card--teal">
        <div class="kpi-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6.5 2H20V22H6.5A2.5 2.5 0 014 19.5V4.5A2.5 2.5 0 016.5 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="kpi-card__label">今日 Token 消耗</div>
        <div class="kpi-card__value">{{ formatNumber(overview.todayTokens) }}</div>
      </div>
      <div class="kpi-card kpi-card--amber">
        <div class="kpi-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 1V23M17 5H9.5C7.567 5 6 6.567 6 8.5C6 10.433 7.567 12 9.5 12H14.5C16.433 12 18 13.567 18 15.5C18 17.433 16.433 19 14.5 19H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="kpi-card__label">今日费用（元）</div>
        <div class="kpi-card__value">{{ formatCost(overview.todayCost) }}</div>
      </div>
      <div class="kpi-card kpi-card--green">
        <div class="kpi-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="kpi-card__label">今日成功率</div>
        <div class="kpi-card__value">{{ formatPercent(overview.todaySuccessRate) }}</div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p>暂无概览数据</p>
    </div>

    <!-- ── 趋势图（ECharts） ── -->
    <div class="section-card">
      <div class="section-card__header">
        <h2 class="section-card__title">调用趋势</h2>
        <div class="period-tabs">
          <button
            v-for="opt in periodOptions"
            :key="opt.value"
            class="period-tab"
            :class="{ active: selectedPeriod === opt.value }"
            @click="selectedPeriod = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-loading="loadingTrend" class="trend-chart-container">
        <div v-if="hasTrendData" ref="trendChartRef" class="trend-chart-body" />
        <div v-else-if="!loadingTrend" class="empty-state">
          <p>暂无趋势数据</p>
        </div>
      </div>
    </div>

    <!-- ── 排行区域 ── -->
    <div class="rank-grid">
      <!-- 用户排行 -->
      <div class="section-card">
        <div class="section-card__header">
          <h2 class="section-card__title">用户排行</h2>
        </div>

        <div v-loading="loadingRank" class="rank-content">
          <div v-if="userRank.length > 0" ref="userRankChartRef" class="rank-chart-body" />
          <table v-if="userRank.length > 0" class="rank-table">
            <thead>
              <tr>
                <th class="rank-num-col">#</th>
                <th>用户</th>
                <th class="num-col">调用次数</th>
                <th class="num-col">Token</th>
                <th class="num-col">费用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in userRank" :key="item.id">
                <td class="rank-num-col">
                  <span class="rank-badge" :class="getRankBadgeClass(idx)">{{ idx + 1 }}</span>
                </td>
                <td class="name-col">
                  <div class="user-chip">
                    <span class="user-chip__avatar" :style="{ background: getAvatarColor(idx) }">
                      {{ getInitial(item.name) }}
                    </span>
                    <span class="user-chip__name">{{ item.name || '未知' }}</span>
                  </div>
                </td>
                <td class="num-col">{{ formatNumber(item.totalRequests) }}</td>
                <td class="num-col">{{ formatNumber(item.totalTokens) }}</td>
                <td class="num-col num-col--cost">{{ formatCost(item.totalCost) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else-if="!loadingRank" class="empty-state">
            <p>暂无用户排行数据</p>
          </div>
        </div>
      </div>

      <!-- 群组排行 -->
      <div class="section-card">
        <div class="section-card__header">
          <h2 class="section-card__title">群组排行</h2>
        </div>

        <div v-loading="loadingRank" class="rank-content">
          <div v-if="groupRank.length > 0" ref="groupRankChartRef" class="rank-chart-body" />
          <table v-if="groupRank.length > 0" class="rank-table">
            <thead>
              <tr>
                <th class="rank-num-col">#</th>
                <th>群组</th>
                <th class="num-col">调用次数</th>
                <th class="num-col">Token</th>
                <th class="num-col">费用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in groupRank" :key="item.id">
                <td class="rank-num-col">
                  <span class="rank-badge" :class="getRankBadgeClass(idx)">{{ idx + 1 }}</span>
                </td>
                <td class="name-col">{{ item.name || '未知' }}</td>
                <td class="num-col">{{ formatNumber(item.totalRequests) }}</td>
                <td class="num-col">{{ formatNumber(item.totalTokens) }}</td>
                <td class="num-col num-col--cost">{{ formatCost(item.totalCost) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else-if="!loadingRank" class="empty-state">
            <p>暂无群组排行数据</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page container */
.metrics-page {
  background: var(--surface-white);
  border-radius: var(--radius-lg);
  padding: 10px;
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-sm);
}

/* ── 刷新按钮（页头操作） ── */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.86rem;
  font-weight: 600;
  border: 1px solid var(--border-default);
  background: var(--surface-white);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.action-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-muted);
  background: var(--surface-subtle);
}

/* ── 错误提示 ── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.03));
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}
.error-banner svg {
  flex-shrink: 0;
  color: #ef4444;
}

/* ── KPI 卡片网格 ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}

.kpi-card {
  position: relative;
  background: var(--surface-white);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: default;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

/* 渐变顶部装饰条 */
.kpi-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 3px;
}
.kpi-card--blue::after {
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}
.kpi-card--teal::after {
  background: linear-gradient(90deg, #14b8a6, #5eead4);
}
.kpi-card--amber::after {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.kpi-card--green::after {
  background: linear-gradient(90deg, #22c55e, #4ade80);
}

.kpi-card__icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.kpi-card--blue .kpi-card__icon {
  background: #eff6ff;
  color: #3b82f6;
}
.kpi-card--teal .kpi-card__icon {
  background: #f0fdfa;
  color: #14b8a6;
}
.kpi-card--amber .kpi-card__icon {
  background: #fffbeb;
  color: #f59e0b;
}
.kpi-card--green .kpi-card__icon {
  background: #f0fdf4;
  color: #22c55e;
}

.kpi-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
.kpi-card__value {
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-size: 30px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  margin-top: 4px;
}

/* ── 加载骨架 ── */
.loading-placeholder {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 28px;
}
.skeleton-card {
  height: 140px;
  background: linear-gradient(
    90deg,
    var(--surface-muted) 25%,
    var(--surface-subtle) 50%,
    var(--surface-muted) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 16px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ── 通用区域卡片 ── */
.section-card {
  background: var(--surface-white);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 28px 32px;
  margin-bottom: 24px;
}
.section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.section-card__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.section-card__hint {
  font-size: 13px;
  color: var(--text-muted);
}

/* ── 趋势图容器 ── */
.trend-chart-container {
  min-height: 320px;
}
.trend-chart-body {
  width: 100%;
  height: 320px;
}

/* ── 时间段选择器（分段胶囊） ── */
.period-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}
.period-tab {
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  background: none;
  font-family: inherit;
}
.period-tab:hover {
  color: var(--text-primary);
}
.period-tab.active {
  background: #fff;
  color: #3b82f6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ── 排行区域 ── */
.rank-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.rank-content {
  min-height: 200px;
}

.rank-chart-body {
  width: 100%;
  height: 200px;
  margin-bottom: 16px;
}

/* ── 排行表格 ── */
.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.rank-table th {
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}
.rank-table td {
  padding: 14px;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-primary);
}
.rank-table tbody tr {
  transition: background 0.15s;
}
.rank-table tbody tr:hover {
  background: #f8fafc;
}
.rank-table tbody tr:last-child td {
  border-bottom: none;
}

.rank-num-col {
  width: 44px;
  text-align: center;
}
.num-col {
  text-align: right;
  font-family: 'Poppins', 'Noto Sans SC', sans-serif;
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.num-col--cost {
  color: var(--text-primary);
}
.name-col {
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 排名徽章 ── */
.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  background: #f1f5f9;
}
.rank-badge--gold {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
}
.rank-badge--silver {
  background: linear-gradient(135deg, #94a3b8, #64748b);
  color: #fff;
}
.rank-badge--bronze {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff;
}

/* ── 用户芯片 ── */
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-chip__avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.user-chip__name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 空状态 ── */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 14px;
}

/* ── 响应式 ── */
@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .loading-placeholder {
    grid-template-columns: repeat(2, 1fr);
  }
  .rank-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  .loading-placeholder {
    grid-template-columns: 1fr;
  }
  .kpi-card__value {
    font-size: 24px;
  }
  .trend-chart-body {
    height: 240px;
  }
  .section-card {
    padding: 20px 18px;
  }
}
</style>
