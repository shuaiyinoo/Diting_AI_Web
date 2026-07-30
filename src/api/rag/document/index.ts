import request from '@/utils/request';
import type {
  DocumentItem,
  DocumentListQuery,
  DocumentPreview,
  InitDocumentUploadPayload,
  TripleExtractionProgress,
  UploadChunkPayload,
  UploadInitResult,
  UploadStatusResult
} from './types';

export type {
  DocumentItem,
  DocumentListQuery,
  DocumentPreview,
  InitDocumentUploadPayload,
  TripleExtractionProgress,
  UploadChunkPayload,
  UploadInitResult,
  UploadStatusResult
} from './types';

/**
 * 查询文档列表
 */
export async function fetchDocuments(query: DocumentListQuery = {}): Promise<DocumentItem[]> {
  const res = await request({ url: '/rag/documents', method: 'get', params: query });
  return res.data as DocumentItem[];
}

/**
 * 预览文档完整内容
 */
export async function fetchDocumentPreview(
  documentId: number,
  groupId: number
): Promise<DocumentPreview> {
  const res = await request({
    url: `/rag/documents/${documentId}/preview`,
    method: 'get',
    params: { groupId }
  });
  return res.data as DocumentPreview;
}

export interface UploadDocumentPayload {
  groupId: number;
  file: File;
  onProgress?: (loadedBytes: number, totalBytes?: number) => void;
}

/**
 * 直接上传文档（适用于小文件）
 */
export async function uploadDocument(payload: UploadDocumentPayload): Promise<number> {
  const formData = new FormData();
  formData.append('groupId', String(payload.groupId));
  formData.append('file', payload.file);
  const res = await request({
    url: '/rag/documents/upload',
    method: 'post',
    data: formData,
    onUploadProgress: (event: any) => {
      payload.onProgress?.(event.loaded, event.total);
    }
  });
  return res.data as number;
}

/**
 * 初始化分片上传会话
 */
export async function initDocumentUpload(
  payload: InitDocumentUploadPayload,
  signal?: AbortSignal,
): Promise<UploadInitResult> {
  const res = await request({ url: '/rag/documents/upload/init', method: 'post', data: payload, signal });
  return res.data as UploadInitResult;
}

/**
 * 上传单个分片
 */
export async function uploadDocumentChunk(
  payload: UploadChunkPayload,
  onProgress?: (loadedBytes: number) => void,
  signal?: AbortSignal,
): Promise<UploadStatusResult> {
  const formData = new FormData();
  formData.append('uploadId', payload.uploadId);
  formData.append('chunkIndex', String(payload.chunkIndex));
  formData.append('chunkHash', payload.chunkHash);
  formData.append('chunk', payload.chunk);
  const res = await request({
    url: '/rag/documents/upload/chunks',
    method: 'post',
    data: formData,
    onUploadProgress: (event: any) => {
      onProgress?.(event.loaded);
    },
    signal,
  });
  return res.data as UploadStatusResult;
}

/**
 * 查询分片上传会话当前状态
 */
export async function fetchUploadStatus(uploadId: string): Promise<UploadStatusResult> {
  const res = await request({ url: `/rag/documents/upload/${uploadId}`, method: 'get' });
  return res.data as UploadStatusResult;
}

/**
 * 完成分片上传，合并所有分片为最终文档
 */
export async function completeDocumentUpload(
  uploadId: string,
  signal?: AbortSignal,
): Promise<number> {
  const res = await request({ url: `/rag/documents/upload/${uploadId}/complete`, method: 'post', signal });
  return res.data as number;
}

/**
 * 删除文档（软删除）
 */
export async function deleteDocument(documentId: number, groupId: number): Promise<void> {
  await request({ url: `/rag/documents/${documentId}`, method: 'delete', params: { groupId } });
}

/**
 * 重新处理失败的文档
 */
export async function retryDocumentIngestion(
  documentId: number,
  groupId: number
): Promise<void> {
  await request({
    url: `/rag/documents/${documentId}/retry-ingestion`,
    method: 'post',
    params: { groupId }
  });
}

/**
 * 查询文档的三元组抽取进度
 */
export async function fetchTripleExtractionProgress(
  documentId: number
): Promise<TripleExtractionProgress> {
  const res = await request({ url: `/rag/documents/${documentId}/triple-progress`, method: 'get' });
  return res.data as TripleExtractionProgress;
}

/**
 * 下载文档原始文件
 */
export async function downloadDocument(documentId: number, groupId: number): Promise<Blob> {
  const response = await request({
    url: `/rag/documents/${documentId}/download`,
    method: 'get',
    params: { groupId },
    responseType: 'blob'
  } as any);
  return response as unknown as Blob;
}
