import request from '@/utils/request';
import { getToken } from '@/utils/auth';
import type {
  AskQuestionPayload,
  AskQuestionResponse,
  CitationItem,
  EvidenceOverview,
  QaRecordDetail,
  QaRecordListQuery,
  QaRecordPage,
  QaStreamHandlers
} from './types';

export type {
  AskQuestionPayload,
  AskQuestionResponse,
  CitationItem,
  EvidenceOverview,
  QaRecordCitation,
  QaRecordDetail,
  QaRecordListItem,
  QaRecordListQuery,
  QaRecordPage,
  QaStreamHandlers
} from './types';

/**
 * 在指定群组知识库中提问
 */
export async function askQuestion(data: AskQuestionPayload): Promise<AskQuestionResponse> {
  const res = await request({ url: '/rag/qa/ask', method: 'post', data });
  return res.data as AskQuestionResponse;
}

/**
 * 查询问答记录列表
 */
export async function listQaRecords(query: QaRecordListQuery = {}): Promise<QaRecordPage> {
  const res = await request({ url: '/rag/qa/records', method: 'get', params: query });
  return res.data as QaRecordPage;
}

/**
 * 获取问答记录详情
 */
export async function getQaRecord(recordId: number): Promise<QaRecordDetail> {
  const res = await request({ url: `/rag/qa/records/${recordId}`, method: 'get' });
  return res.data as QaRecordDetail;
}

/**
 * 删除问答记录
 */
export async function deleteQaRecord(recordId: number): Promise<void> {
  await request({ url: `/rag/qa/records/${recordId}`, method: 'delete' });
}

/**
 * 流式提问（SSE）
 */
export async function streamAskQuestion(
  payload: AskQuestionPayload,
  handlers: QaStreamHandlers
): Promise<void> {
  const baseUrl = (import.meta.env.VITE_APP_BASE_API ?? '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/rag/qa/stream-ask`, {
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
    const message = await response.text().catch(() => '流式问答请求失败');
    throw new Error(message || '流式问答请求失败');
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
      dispatchQaSseEvent(rawEvent, handlers);
      separatorIndex = buffer.indexOf('\n\n');
    }
  }
}

function dispatchQaSseEvent(rawEvent: string, handlers: QaStreamHandlers): void {
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

  if (dataLines.length === 0) return;
  const rawData = dataLines.join('\n');

  switch (eventName) {
    case 'token':
      handlers.onToken(rawData);
      break;
    case 'citations':
      try {
        handlers.onCitations(JSON.parse(rawData) as CitationItem[]);
      } catch {
        handlers.onCitations([]);
      }
      break;
    case 'evidence-overview':
      try {
        handlers.onEvidenceOverview?.(JSON.parse(rawData) as EvidenceOverview);
      } catch {
        handlers.onEvidenceOverview?.(null);
      }
      break;
    case 'error':
      try {
        const parsed = JSON.parse(rawData) as { message?: string };
        handlers.onError(parsed.message ?? '流式问答服务内部错误');
      } catch {
        handlers.onError(rawData);
      }
      break;
    case 'record':
      try {
        const parsed = JSON.parse(rawData) as { recordId?: number };
        if (typeof parsed.recordId === 'number') {
          handlers.onRecord?.(parsed.recordId);
        }
      } catch {
        // ignore
      }
      break;
    default:
      break;
  }
}
