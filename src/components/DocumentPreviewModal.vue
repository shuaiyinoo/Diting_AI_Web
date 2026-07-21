<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileViewer } from '@file-viewer/vue3-full'
import { downloadDocument, type DocumentItem } from '@/api/rag/document'
import { extractErrorMessage } from '@/utils/request'

const props = defineProps<{
  visible: boolean
  document: DocumentItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const loading = ref(false)
const downloading = ref(false)
const error = ref('')
const fileSource = ref<File | null>(null)

const viewerOptions = computed(() => ({
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}))

const normalizedFileExt = computed(() => {
  const ext = props.document?.fileExt?.toLowerCase() ?? ''
  return ext.startsWith('.') ? ext.slice(1) : ext
})

const fileMetaItems = computed(() => {
  if (!props.document) return []
  return [
    fileTypeLabel(normalizedFileExt.value),
    formatFileSize(props.document.fileSize),
    statusLabel(props.document.status),
    props.document.uploaderDisplayName ? `上传者：${props.document.uploaderDisplayName}` : '',
    props.document.uploadedAt ? formatDateTime(props.document.uploadedAt) : '',
  ].filter(Boolean)
})

watch(
  () => [props.visible, props.document] as const,
  async ([visible, doc]) => {
    if (!visible || !doc) return

    loading.value = true
    error.value = ''
    fileSource.value = null

    try {
      const blob = await downloadDocument(doc.documentId, doc.groupId)
      fileSource.value = new File([blob], doc.fileName, { type: blob.type || undefined })
    } catch (err) {
      error.value = (await extractErrorMessage(err)) || '加载预览失败'
    } finally {
      loading.value = false
    }
  },
)

function close() {
  fileSource.value = null
  emit('update:visible', false)
}

async function downloadCurrentDocument() {
  const doc = props.document
  if (!doc || downloading.value) return

  downloading.value = true
  try {
    const blob = await downloadDocument(doc.documentId, doc.groupId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = (await extractErrorMessage(err)) || '下载文档失败'
  } finally {
    downloading.value = false
  }
}

function fileTypeLabel(ext: string | null): string {
  switch (ext?.toLowerCase()) {
    case 'pdf': return 'PDF 文档'
    case 'md':
    case 'markdown': return 'Markdown'
    case 'txt': return '文本文件'
    case 'docx': return 'Word 文档'
    default: return '文档'
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'READY': return '就绪'
    case 'PROCESSING': return '解析中'
    case 'PENDING': return '等待解析'
    case 'FAILED': return '解析失败'
    default: return status ?? ''
  }
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="min(1120px, calc(100vw - 48px))"
    top="4vh"
    class="document-reader-dialog"
    :close-on-click-modal="true"
    :append-to-body="false"
    :show-close="false"
    @update:model-value="(val: boolean) => { if (!val) close() }"
  >
    <template #header>
      <div class="reader-header">
        <div class="reader-title-group">
          <h2 class="reader-title">{{ document?.fileName ?? '文档预览' }}</h2>
          <div v-if="fileMetaItems.length" class="reader-meta">
            <span
              v-for="item in fileMetaItems"
              :key="item"
              class="reader-meta__item"
            >
              {{ item }}
            </span>
          </div>
        </div>

        <div class="reader-actions">
          <button
            class="reader-icon-btn"
            type="button"
            title="下载文档"
            :disabled="!document || downloading"
            @click="downloadCurrentDocument"
          >
            <span v-if="downloading" class="reader-btn-spinner" />
            <svg
              v-else
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button class="reader-icon-btn" type="button" title="关闭预览" @click="close">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <div class="reader-body">
      <div v-if="loading" class="preview-state">
        <div class="spinner"></div>
        <p>加载预览中...</p>
      </div>

      <div v-else-if="error" class="preview-state preview-error">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" />
          <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="fileSource" class="preview-viewer">
        <FileViewer
          :key="document?.documentId"
          :file="fileSource"
          :options="viewerOptions"
        />
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.reader-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  min-width: 0;
}

.reader-title-group {
  min-width: 0;
}

.reader-title {
  margin: 0;
  color: var(--el-text-color-primary, #303133);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 9px;
}

.reader-meta__item {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 9px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 4px;
  background: var(--el-fill-color-light, #f5f7fa);
  color: var(--el-text-color-secondary, #909399);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.reader-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.reader-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  color: var(--el-text-color-secondary, #909399);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reader-icon-btn:hover:not(:disabled) {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
}

.reader-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.reader-btn-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(64, 158, 255, 0.2);
  border-top-color: var(--el-color-primary, #409eff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.reader-body {
  min-height: 420px;
  height: min(76vh, 820px);
  overflow: hidden;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: var(--el-fill-color-blank, #fff);
}

.preview-state {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.preview-state p {
  margin-top: 14px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 14px;
}

.preview-error {
  color: var(--el-color-danger, #f56c6c);
}

.preview-error svg {
  margin: 0 auto;
}

.preview-error p {
  color: var(--el-color-danger, #f56c6c);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--el-fill-color-light, #f5f7fa);
  border-top-color: var(--el-color-primary, #409eff);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-viewer {
  width: 100%;
  height: 100%;
  padding: 18px;
}

@media (max-width: 720px) {
  .reader-header {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .reader-actions {
    align-self: flex-end;
  }

  .reader-title {
    white-space: normal;
  }

  .reader-body {
    height: 78vh;
  }
}
</style>

<style>
.document-reader-dialog.el-dialog {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(30, 41, 59, 0.18);
}

.document-reader-dialog .el-dialog__header {
  margin: 0;
  padding: 20px 24px 18px;
  border-bottom: 0;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
}

.document-reader-dialog .el-dialog__body {
  padding: 0;
}
</style>
