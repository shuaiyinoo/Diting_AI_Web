/** 助手工具模式 */
export type AssistantToolMode = 'CHAT' | 'KB_SEARCH';

/** 消息角色 */
export type AssistantMessageRole = 'USER' | 'ASSISTANT' | 'TOOL';

/** 知识库引用条目 */
export interface AssistantCitationItem {
  documentId: number | null;
  chunkId: number | null;
  chunkIndex: number | null;
  fileName: string;
  score: number;
  snippet: string | null;
  /** 检索来源：VECTOR / KEYWORD / GRAPH / BOTH */
  retrievalSource?: string | null;
  /** 图谱检索命中时关联的实体名列表 */
  graphEntities?: string[] | null;
}

/** 会话列表项 */
export interface AssistantSessionListItem {
  sessionId: number;
  title: string;
  lastMessageAt: string | null;
}

/** 会话详情 */
export interface AssistantSessionDetail {
  sessionId: number;
  title: string;
  status: string;
  lastMessageAt: string | null;
  createTime: string;
}

/** 会话中的单条消息 */
export interface AssistantMessageItem {
  messageId: number;
  sessionId: number;
  role: AssistantMessageRole;
  toolMode: AssistantToolMode | null;
  groupId: number | null;
  content: string;
  structuredPayload: string | null;
  createTime: string;
}

/** 会话上下文 */
export interface AssistantConversationContext {
  summaryText: string | null;
  recentMessages: AssistantMessageItem[];
}

/** 聊天请求体 */
export interface AssistantChatPayload {
  sessionId: number;
  message: string;
  toolMode: AssistantToolMode;
  groupId?: number | null;
}

/** 同步聊天响应 */
export interface AssistantChatResult {
  sessionId: number;
  messageId: number;
  reply: string;
  toolMode: AssistantToolMode;
  groupId: number | null;
  citations: AssistantCitationItem[];
}

/** SSE 流式聊天事件 */
export interface AssistantChatStreamEvent {
  event: 'start' | 'delta' | 'done' | 'error';
  sessionId: number;
  toolMode: AssistantToolMode;
  groupId: number | null;
  delta: string | null;
  messageId: number | null;
  reply: string | null;
  citations: AssistantCitationItem[];
  error: string | null;
}
