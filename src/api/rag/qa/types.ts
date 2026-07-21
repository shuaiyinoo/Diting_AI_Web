/** 引用来源条目 */
export interface CitationItem {
  documentId: number | null;
  chunkId: number | null;
  chunkIndex: number | null;
  fileName: string;
  score: number;
  snippet: string | null;
}

/** 证据片段 */
export interface EvidenceSnippet {
  evidenceId: string | null;
  chunkId: number | null;
  chunkIndex: number | null;
  startChunkIndex: number | null;
  endChunkIndex: number | null;
  score: number;
  retrievalSource: string;
  snippet: string | null;
}

/** 文档证据分组 */
export interface DocumentEvidenceGroup {
  documentId: number | null;
  fileName: string;
  evidenceCount: number;
  topScore: number;
  retrievalSources: string[];
  snippets: EvidenceSnippet[];
}

/** 证据总览 */
export interface EvidenceOverview {
  documentCount: number;
  evidenceCount: number;
  coverageMode: string;
  groups: DocumentEvidenceGroup[];
  warnings: string[];
}

/** 问答请求参数 */
export interface AskQuestionPayload {
  groupId: number;
  question: string;
}

/** 问答响应结果 */
export interface AskQuestionResponse {
  answered: boolean;
  answer: string | null;
  reasonCode: string | null;
  reasonMessage: string | null;
  citations: CitationItem[];
  evidenceOverview: EvidenceOverview | null;
  recordId: number | null;
}

/** 流式问答事件处理器 */
export interface QaStreamHandlers {
  onToken: (text: string) => void;
  onCitations: (citations: CitationItem[]) => void;
  onEvidenceOverview?: (overview: EvidenceOverview | null) => void;
  onError: (message: string) => void;
  onRecord?: (recordId: number) => void;
  signal?: AbortSignal;
}

/** QA 记录列表查询参数 */
export interface QaRecordListQuery {
  groupId?: number;
  answered?: boolean;
  page?: number;
  pageSize?: number;
}

/** QA 记录列表项 */
export interface QaRecordListItem {
  id: number;
  userId: number;
  groupId: number;
  question: string;
  answered: boolean;
  answerPreview: string;
  reasonCode: string | null;
  evidenceLevel: string | null;
  citationCount: number;
  latencyMs: number;
  createTime: string;
}

/** QA 引用快照 */
export interface QaRecordCitation {
  documentId: number | null;
  documentVersionId: number | null;
  chunkId: number | null;
  chunkIndex: number | null;
  startChunkIndex: number | null;
  endChunkIndex: number | null;
  fileName: string;
  score: number | null;
  retrievalSource: string | null;
  vectorScore: number | null;
  keywordScore: number | null;
  hybridScore: number | null;
  snippet: string | null;
}

/** QA 记录详情 */
export interface QaRecordDetail {
  id: number;
  userId: number;
  groupId: number;
  question: string;
  answer: string | null;
  answered: boolean;
  reasonCode: string | null;
  reasonMessage: string | null;
  evidenceLevel: string | null;
  citationCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  isEstimated: boolean;
  latencyMs: number;
  modelName: string | null;
  endpoint: string;
  success: boolean;
  errorMessage: string | null;
  createTime: string;
  evidenceOverview: EvidenceOverview | null;
  citations: QaRecordCitation[];
}

/** QA 记录分页结果 */
export interface QaRecordPage {
  items: QaRecordListItem[];
  total: number;
  page: number;
  pageSize: number;
}
