import type { CitationItem } from '@/api/rag/qa/types';

/** 图谱节点 */
export interface GraphNode {
  id: string;
  name: string;
  type: string;
  category: 'matched' | 'related' | null;
  description: string | null;
  mentionCount: number;
  score: number;
}

/** 图谱边 */
export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  confidence: number;
}

/** 图谱可视化数据 */
export interface GraphVisualization {
  nodes: GraphNode[];
  edges: GraphEdge[];
  durationMs: number;
}

/** 实体分页列表项 */
export interface EntityListItem {
  name: string;
  type: string;
  description: string | null;
  mentionCount: number;
}

/** 实体分页结果 */
export interface EntityPage {
  items: EntityListItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 实体关联关系 */
export interface EntityRelationItem {
  direction: 'OUTGOING' | 'INCOMING';
  relation: string;
  peerName: string;
  peerType: string;
  confidence: number;
}

/** 实体提及切片 */
export interface EntityMentionedChunk {
  documentId: number | null;
  fileName: string | null;
  chunkId: number | null;
  chunkIndex: number | null;
  snippet: string | null;
}

/** 实体详情 */
export interface EntityDetail {
  name: string;
  type: string;
  description: string | null;
  mentionCount: number;
  relations: EntityRelationItem[];
  mentionedChunks: EntityMentionedChunk[];
}

/** 类型计数 */
export interface GraphTypeCount {
  type: string;
  count: number;
}

/** Top 实体 */
export interface GraphTopEntity {
  name: string;
  type: string;
  mentionCount: number;
}

/** 图谱统计 */
export interface GraphStatistics {
  entityCount: number;
  relationCount: number;
  chunkCount: number;
  entityTypes: GraphTypeCount[];
  relationTypes: GraphTypeCount[];
  topEntities: GraphTopEntity[];
}

/** 图谱问答请求体 */
export interface GraphChatPayload {
  groupId: number;
  question: string;
}

/** 图谱问答结果 */
export interface GraphChatResult {
  answered: boolean;
  answer: string | null;
  citations: CitationItem[];
  graph: GraphVisualization | null;
  durationMs: number;
}
