import request from '@/utils/request';
import type { MetricsOverview, Period, TrendItem, UsageRankItem, UsageStats } from './types';

export type { MetricsOverview, Period, TrendItem, UsageRankItem, UsageStats } from './types';

/**
 * 获取仪表盘概览
 */
export async function fetchMetricsOverview(): Promise<MetricsOverview> {
  const res = await request({ url: '/rag/admin/metrics/overview', method: 'get' });
  return res.data as MetricsOverview;
}

/**
 * 获取平台整体统计
 */
export async function fetchPlatformStats(period: Period): Promise<UsageStats> {
  const res = await request({ url: '/rag/admin/metrics/platform', method: 'get', params: { period } });
  return res.data as UsageStats;
}

/**
 * 获取用户级别统计
 */
export async function fetchUserStats(userId: number, period: Period): Promise<UsageStats> {
  const res = await request({ url: `/rag/admin/metrics/user/${userId}`, method: 'get', params: { period } });
  return res.data as UsageStats;
}

/**
 * 获取群组级别统计
 */
export async function fetchGroupStats(groupId: number, period: Period): Promise<UsageStats> {
  const res = await request({ url: `/rag/admin/metrics/group/${groupId}`, method: 'get', params: { period } });
  return res.data as UsageStats;
}

/**
 * 获取趋势数据
 */
export async function fetchTrend(period: Period, module?: string): Promise<TrendItem[]> {
  const res = await request({ url: '/rag/admin/metrics/trend', method: 'get', params: { period, module } });
  return res.data as TrendItem[];
}

/**
 * 获取用户排行
 */
export async function fetchUserRank(period: Period, limit = 10): Promise<UsageRankItem[]> {
  const res = await request({ url: '/rag/admin/metrics/rank/users', method: 'get', params: { period, limit } });
  return res.data as UsageRankItem[];
}

/**
 * 获取群组排行
 */
export async function fetchGroupRank(period: Period, limit = 10): Promise<UsageRankItem[]> {
  const res = await request({ url: '/rag/admin/metrics/rank/groups', method: 'get', params: { period, limit } });
  return res.data as UsageRankItem[];
}
