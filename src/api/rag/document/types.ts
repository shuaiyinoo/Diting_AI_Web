/** 文档与群组关系枚举 */
export type DocumentGroupRelation = 'OWNER' | 'MEMBER';

/** 文档列表查询参数 */
export interface DocumentListQuery {
  groupId?: number;
  groupRelation?: DocumentGroupRelation;
  fileName?: string;
  uploaderUserId?: number;
  status?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
}

/** 文档列表项 */
export interface DocumentItem {
  documentId: number;
  groupId: number;
  fileName: string;
  fileExt: string | null;
  contentType: string | null;
  fileSize: number;
  status: string;
  failureReason: string | null;
  uploadedAt: string;
  uploaderUserId: number | null;
  uploaderDisplayName: string | null;
  uploaderUserCode: string | null;
  previewText: string | null;
  /** 三元组抽取状态摘要：NONE | PENDING | EXTRACTING | SUCCESS | PARTIAL | FAILED */
  tripleStatus: string | null;
  /** 三元组抽取总块数 */
  tripleTotalChunks: number | null;
  /** 三元组抽取成功数 */
  tripleSuccessCount: number | null;
  /** 三元组抽取失败数 */
  tripleFailedCount: number | null;
}

/** 三元组抽取进度 */
export interface TripleExtractionProgress {
  documentId: number;
  totalChunks: number;
  successCount: number;
  failedCount: number;
  extractingCount: number;
  pendingCount: number;
  /** 整体状态：NONE | PENDING | EXTRACTING | SUCCESS | PARTIAL | FAILED */
  overallStatus: string;
}

/** 文档预览信息 */
export interface DocumentPreview {
  documentId: number;
  groupId: number;
  fileName: string;
  previewText: string;
  status: string | null;
}

/** 初始化分片上传请求参数 */
export interface InitDocumentUploadPayload {
  groupId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  fileHash: string;
  chunkSize: number;
  chunkCount: number;
}

/** 上传单个分片的请求参数 */
export interface UploadChunkPayload {
  uploadId: string;
  chunkIndex: number;
  chunkHash: string;
  chunk: Blob;
}

/** 初始化分片上传的响应结果 */
export interface UploadInitResult {
  instantUpload: boolean;
  documentId: number | null;
  uploadId: string | null;
  uploadedChunks: number[];
  chunkSize: number | null;
  chunkCount: number | null;
}

/** 分片上传状态 */
export interface UploadStatusResult {
  status: string;
  uploadedChunks: number[];
  uploadedChunkCount: number;
  chunkCount: number | null;
}
