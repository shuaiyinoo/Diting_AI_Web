import request from '@/utils/request';
import type {
  EntityDetail,
  EntityPage,
  GraphChatPayload,
  GraphChatResult,
  GraphStatistics,
  GraphVisualization
} from './types';

export type {
  EntityDetail,
  EntityListItem,
  EntityMentionedChunk,
  EntityPage,
  EntityRelationItem,
  GraphChatPayload,
  GraphChatResult,
  GraphEdge,
  GraphNode,
  GraphStatistics,
  GraphTopEntity,
  GraphTypeCount,
  GraphVisualization
} from './types';

/** 全图采样总览（探索页首屏） */
export async function fetchGraphOverview(groupId: number, limit = 150): Promise<GraphVisualization> {
  const res = await request({ url: '/rag/graph/overview', method: 'get', params: { groupId, limit } });
  return res.data as GraphVisualization;
}

/** 问题驱动的图谱检索（返回可视化节点与边） */
export async function searchGraph(groupId: number, question: string): Promise<GraphVisualization> {
  const res = await request({ url: '/rag/graph/search', method: 'get', params: { groupId, question } });
  return res.data as GraphVisualization;
}

/** 实体中心子图（节点扩展 / 证据溯源） */
export async function fetchSubgraph(groupId: number, entityName: string, depth = 1): Promise<GraphVisualization> {
  const res = await request({ url: '/rag/graph/subgraph', method: 'get', params: { groupId, entityName, depth } });
  return res.data as GraphVisualization;
}

/** 实体分页检索 */
export async function fetchEntities(
  groupId: number,
  params: { keyword?: string; type?: string; page?: number; pageSize?: number } = {}
): Promise<EntityPage> {
  const res = await request({ url: '/rag/graph/entities', method: 'get', params: { groupId, ...params } });
  return res.data as EntityPage;
}

/** 实体详情（属性 + 关系 + 提及切片） */
export async function fetchEntityDetail(groupId: number, name: string): Promise<EntityDetail> {
  const res = await request({ url: '/rag/graph/entity', method: 'get', params: { groupId, name } });
  return res.data as EntityDetail;
}

/** 实体类型清单 */
export async function fetchGraphTypes(groupId: number): Promise<string[]> {
  const res = await request({ url: '/rag/graph/types', method: 'get', params: { groupId } });
  return res.data as string[];
}

/** 图谱统计 */
export async function fetchGraphStatistics(groupId: number): Promise<GraphStatistics> {
  const res = await request({ url: '/rag/graph/statistics', method: 'get', params: { groupId } });
  return res.data as GraphStatistics;
}

/** 图谱问答 */
export async function graphChat(data: GraphChatPayload): Promise<GraphChatResult> {
  const res = await request({ url: '/rag/graph/chat', method: 'post', data });
  return res.data as GraphChatResult;
}
