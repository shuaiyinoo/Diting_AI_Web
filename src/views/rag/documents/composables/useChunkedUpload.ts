import { ref } from 'vue'
import {
  initDocumentUpload,
  uploadDocumentChunk,
  completeDocumentUpload,
} from '@/api/rag/document'
import { extractErrorMessage } from '@/utils/request'

/** 每个分片的大小（字节） */
const CHUNK_SIZE = 5 * 1024 * 1024 // 5 MB

/** 上传阶段 */
export type UploadStage = 'hashing' | 'init' | 'uploading' | 'completing' | null

/**
 * 分片上传 composable
 *
 * 流程：
 * 1. hashing  — 计算文件整体 SHA-256 指纹（用于秒传判断）
 * 2. init     — 初始化上传会话，获取 uploadId 及断点续传信息
 * 3. uploading— 逐片上传，跳过已上传分片
 * 4. completing— 合并分片，完成上传
 *
 * 支持秒传（instantUpload）与断点续传（uploadedChunks）。
 */
export function useChunkedUpload() {
  const isUploading = ref(false)
  const progress = ref(0)
  const error = ref('')
  const stage = ref<UploadStage>(null)
  const hashingProgress = ref('')
  const chunkProgress = ref({ uploaded: 0, total: 0 })

  let abortController: AbortController | null = null

  /** 计算 Blob 的 SHA-256 哈希（hex 字符串） */
  async function computeHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    return new Uint8Array(hashBuffer).reduce(
      (hex, byte) => hex + byte.toString(16).padStart(2, '0'),
      '',
    )
  }

  /**
   * 执行分片上传
   *
   * @param file 要上传的文件
   * @param groupId 目标群组 ID
   */
  async function uploadFile(file: File, groupId: number) {
    isUploading.value = true
    error.value = ''
    progress.value = 0
    abortController = new AbortController()

    try {
      // ── Stage 1: 计算文件指纹 ──
      stage.value = 'hashing'
      hashingProgress.value = ''
      const fileHash = await computeHash(file)

      // ── Stage 2: 初始化上传会话 ──
      stage.value = 'init'
      const chunkCount = Math.ceil(file.size / CHUNK_SIZE)
      const initResult = await initDocumentUpload(
        {
          groupId,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
          fileHash,
          chunkSize: CHUNK_SIZE,
          chunkCount,
        },
        abortController.signal,
      )

      // 秒传：文件已存在，直接完成
      if (initResult.instantUpload) {
        progress.value = 100
        stage.value = null
        return
      }

      const uploadId = initResult.uploadId!
      const uploadedSet = new Set(initResult.uploadedChunks)
      chunkProgress.value = { uploaded: uploadedSet.size, total: chunkCount }

      // ── Stage 3: 逐片上传（跳过已上传分片，支持断点续传）──
      stage.value = 'uploading'
      for (let i = 0; i < chunkCount; i++) {
        if (uploadedSet.has(i)) continue

        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunkBlob = file.slice(start, end)
        const chunkHash = await computeHash(chunkBlob)

        await uploadDocumentChunk(
          {
            uploadId,
            chunkIndex: i,
            chunkHash,
            chunk: chunkBlob,
          },
          (loaded) => {
            const chunkBytes = end - start
            const chunkFraction = chunkBytes > 0 ? loaded / chunkBytes : 0
            const overallFraction = (uploadedSet.size + chunkFraction) / chunkCount
            progress.value = Math.round(overallFraction * 100)
          },
          abortController.signal,
        )

        uploadedSet.add(i)
        chunkProgress.value = { uploaded: uploadedSet.size, total: chunkCount }
      }

      // ── Stage 4: 合并分片，完成上传 ──
      stage.value = 'completing'
      await completeDocumentUpload(uploadId, abortController.signal)
      progress.value = 100
      stage.value = null
    } catch (err) {
      if (abortController?.signal.aborted) {
        error.value = '上传已取消'
      } else {
        error.value = '上传文件失败'
      }
      throw err
    } finally {
      isUploading.value = false
      abortController = null
    }
  }

  /** 取消正在进行的上传 */
  function cancel() {
    if (abortController) {
      abortController.abort()
    }
    isUploading.value = false
    stage.value = null
  }

  /** 重置所有状态 */
  function reset() {
    if (abortController) {
      abortController.abort()
    }
    isUploading.value = false
    progress.value = 0
    error.value = ''
    stage.value = null
    hashingProgress.value = ''
    chunkProgress.value = { uploaded: 0, total: 0 }
    abortController = null
  }

  return {
    isUploading,
    progress,
    error,
    stage,
    hashingProgress,
    chunkProgress,
    uploadFile,
    cancel,
    reset,
  }
}
