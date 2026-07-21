import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import type {
  AssistantChatPayload,
  AssistantChatResult,
  AssistantChatStreamEvent,
  AssistantConversationContext,
  AssistantSessionDetail,
  AssistantSessionListItem
} from './types';

export type {
  AssistantChatPayload,
  AssistantChatResult,
  AssistantChatStreamEvent,
  AssistantConversationContext,
  AssistantSessionDetail,
  AssistantSessionListItem
} from './types';

/**
 * 创建新的助手会话
 */
export async function createAssistantSession(): Promise<AssistantSessionDetail> {
  const res = await request({ url: '/rag/assistant/sessions', method: 'post' });
  const payload = res.data as any;
  return (payload?.data ?? payload) as AssistantSessionDetail;
}

/**
 * 获取当前用户的会话列表
 */
export async function fetchAssistantSessions(): Promise<AssistantSessionListItem[]> {
  const res = await request({ url: '/rag/assistant/sessions', method: 'get' });
  const payload = res.data as any;
  return (payload?.data ?? payload ?? []) as AssistantSessionListItem[];
}

/**
 * 获取指定会话的详细信息
 */
export async function fetchAssistantSessionDetail(
  sessionId: number
): Promise<AssistantSessionDetail> {
  const res = await request({ url: `/rag/assistant/sessions/${sessionId}`, method: 'get' });
  const payload = res.data as any;
  return (payload?.data ?? payload) as AssistantSessionDetail;
}

/**
 * 重命名会话
 */
export async function renameAssistantSession(
  sessionId: number,
  title: string
): Promise<AssistantSessionDetail> {
  const res = await request({
    url: `/rag/assistant/sessions/${sessionId}`,
    method: 'put',
    data: { title }
  });
  const payload = res.data as any;
  return (payload?.data ?? payload) as AssistantSessionDetail;
}

/**
 * 删除指定会话
 */
export async function deleteAssistantSession(sessionId: number): Promise<void> {
  await request({ url: `/rag/assistant/sessions/${sessionId}`, method: 'delete' });
}

/**
 * 获取指定会话的上下文信息
 */
export async function fetchAssistantConversationContext(
  sessionId: number,
  recentLimit = 12
): Promise<AssistantConversationContext> {
  const res = await request({
    url: `/rag/assistant/sessions/${sessionId}/context`,
    method: 'get',
    params: { recentLimit }
  });
  const payload = res.data as any;
  return (payload?.data ?? payload ?? { recentMessages: [] }) as AssistantConversationContext;
}

/**
 * 同步聊天（非流式）
 */
export async function sendAssistantMessage(
  data: AssistantChatPayload
): Promise<AssistantChatResult> {
  const res = await request({ url: '/rag/assistant/chat', method: 'post', data });
  return res.data as AssistantChatResult;
}

/**
 * 流式聊天（SSE）
 */
export async function streamAssistantMessage(
  payload: AssistantChatPayload,
  handlers: {
    onEvent: (event: AssistantChatStreamEvent) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  const baseUrl = (import.meta.env.VITE_APP_BASE_API ?? '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/rag/assistant/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      clientid: import.meta.env.VITE_APP_CLIENT_ID
    },
    body: JSON.stringify(payload),
    signal: handlers.signal
  });

  if (!response.ok || response.body == null) {
    const message = await response.text();
    throw new Error(message || '发送流式消息失败');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex >= 0) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const parsed = parseSseEvent(rawEvent);
      if (parsed !== null) {
        handlers.onEvent(parsed);
      }
      separatorIndex = buffer.indexOf('\n\n');
    }
  }
}

function parseSseEvent(rawEvent: string): AssistantChatStreamEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  let eventName = '';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;

  const parsed = JSON.parse(dataLines.join('\n')) as AssistantChatStreamEvent;
  return {
    ...parsed,
    event: (eventName || parsed.event) as AssistantChatStreamEvent['event']
  };
}
