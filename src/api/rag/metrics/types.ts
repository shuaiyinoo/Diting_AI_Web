/** 时间段枚举 */
export type Period = 'TODAY' | 'LAST_7_DAYS' | 'LAST_14_DAYS' | 'LAST_30_DAYS';

/** 仪表盘概览 */
export interface MetricsOverview {
  todayRequests: number;
  todayTokens: number;
  todayCost: number;
  todaySuccessRate: number;
  dailyTrend: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

/** 使用统计 */
export interface UsageStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  avgRpm: number;
  avgTpm: number;
}

/** 使用排行项 */
export interface UsageRankItem {
  id: number;
  name: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

/** 趋势数据项 */
export interface TrendItem {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}
