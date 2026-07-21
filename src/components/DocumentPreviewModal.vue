<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchDocumentPreview, downloadDocument, type DocumentItem } from '@/api/rag/document'
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
const htmlContent = ref('')
const textContent = ref('')
const pdfUrl = ref('')

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
    htmlContent.value = ''
    textContent.value = ''
    revokePdfUrl()

    try {
      const ext = normalizedFileExt.value

      if (ext === 'pdf') {
        const blob = await downloadDocument(doc.documentId, doc.groupId)
        pdfUrl.value = URL.createObjectURL(blob)
      } else if (ext === 'md' || ext === 'markdown') {
        const preview = await fetchDocumentPreview(doc.documentId, doc.groupId)
        textContent.value = preview.previewText || '(暂无内容)'
      } else {
        const preview = await fetchDocumentPreview(doc.documentId, doc.groupId)
        textContent.value = preview.previewText || '(暂无文本内容)'
      }
    } catch (err) {
      error.value = (await extractErrorMessage(err)) || '加载预览失败'
    } finally {
      loading.value = false
    }
  },
)

function close() {
  revokePdfUrl()
  emit('update:visible', false)
}

function revokePdfUrl() {
  if (!pdfUrl.value) return
  URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
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

      <div v-else-if="pdfUrl" class="preview-pdf">
        <iframe :src="pdfUrl" class="pdf-frame" frameborder="0"></iframe>
      </div>

      <div v-else-if="htmlContent" class="preview-markdown-wrapper">
        <div class="preview-markdown" v-html="htmlContent"></div>
      </div>

      <div v-else class="preview-text">
        <pre>{{ textContent }}</pre>
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

.preview-pdf {
  width: 100%;
  height: 100%;
  padding: 18px;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: #fff;
}

.preview-text,
.preview-markdown-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: 34px clamp(22px, 5vw, 64px) 56px;
}

.preview-text pre,
.preview-markdown {
  width: min(760px, 100%);
  margin: 0 auto;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.preview-text pre {
  padding: 26px 30px;
  color: var(--el-text-color-primary, #303133);
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13.5px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-markdown {
  padding: 34px clamp(24px, 4vw, 48px) 54px;
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

  .preview-text,
  .preview-markdown-wrapper {
    padding: 18px 12px 32px;
  }

  .preview-markdown {
    padding: 24px 18px 36px;
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

.preview-markdown-wrapper .preview-markdown {
  color: var(--el-text-color-primary, #303133);
  font-size: 15px;
  line-height: 1.85;
}

.preview-markdown-wrapper h1,
.preview-markdown-wrapper h2,
.preview-markdown-wrapper h3,
.preview-markdown-wrapper h4,
.preview-markdown-wrapper h5,
.preview-markdown-wrapper h6 {
  color: var(--el-text-color-primary, #303133);
  line-height: 1.35;
}

.preview-markdown-wrapper h1:first-child,
.preview-markdown-wrapper h2:first-child,
.preview-markdown-wrapper h3:first-child {
  margin-top: 0;
}

.preview-markdown-wrapper h1 {
  margin: 0 0 0.8em;
  padding-bottom: 0.35em;
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  font-size: 1.75em;
  font-weight: 800;
}

.preview-markdown-wrapper h2 {
  margin: 1.8em 0 0.7em;
  padding-bottom: 0.28em;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  font-size: 1.42em;
  font-weight: 760;
}

.preview-markdown-wrapper h3 {
  margin: 1.5em 0 0.55em;
  font-size: 1.18em;
  font-weight: 720;
}

.preview-markdown-wrapper h4 {
  margin: 1.35em 0 0.45em;
  font-size: 1.06em;
  font-weight: 680;
}

.preview-markdown-wrapper h5,
.preview-markdown-wrapper h6 {
  margin: 1.1em 0 0.4em;
  color: var(--el-text-color-secondary, #909399);
  font-size: 0.96em;
  font-weight: 650;
}

.preview-markdown-wrapper p {
  margin: 0.78em 0;
}

.preview-markdown-wrapper p:first-child {
  margin-top: 0;
}

.preview-markdown-wrapper p:last-child {
  margin-bottom: 0;
}

.preview-markdown-wrapper strong {
  color: var(--el-text-color-primary, #303133);
  font-weight: 700;
}

.preview-markdown-wrapper code {
  padding: 2px 6px;
  border-radius: 4px;
  background: #eef6ff;
  color: #1f6fb8;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.88em;
  word-break: break-word;
}

.preview-markdown-wrapper pre {
  margin: 1.1em 0;
  overflow-x: auto;
  border: 1px solid rgba(30, 41, 59, 0.16);
  border-radius: 6px;
  background: #182235;
  padding: 18px;
}

.preview-markdown-wrapper pre code {
  padding: 0;
  background: none;
  color: #e2e8f0;
  font-size: 0.86em;
  line-height: 1.7;
}

.preview-markdown-wrapper blockquote {
  margin: 1.1em 0;
  padding: 12px 16px;
  border-left: 3px solid var(--el-color-primary, #409eff);
  border-radius: 0 6px 6px 0;
  background: rgba(64, 158, 255, 0.06);
  color: var(--el-text-color-secondary, #909399);
}

.preview-markdown-wrapper ul,
.preview-markdown-wrapper ol {
  margin: 0.75em 0;
  padding-left: 1.55em;
}

.preview-markdown-wrapper ul {
  list-style: disc;
}

.preview-markdown-wrapper ol {
  list-style: decimal;
}

.preview-markdown-wrapper li {
  margin: 0.32em 0;
  padding-left: 0.12em;
}

.preview-markdown-wrapper table {
  display: block;
  width: 100%;
  margin: 1.25em 0;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-markdown-wrapper th,
.preview-markdown-wrapper td {
  border: 1px solid var(--el-border-color, #dcdfe6);
  padding: 9px 12px;
  text-align: left;
}

.preview-markdown-wrapper th {
  background: var(--el-fill-color-light, #f5f7fa);
  font-weight: 700;
  white-space: nowrap;
}

.preview-markdown-wrapper a {
  color: var(--el-color-primary, #409eff);
  font-weight: 650;
  text-decoration: none;
}

.preview-markdown-wrapper a:hover {
  text-decoration: underline;
}

.preview-markdown-wrapper img {
  max-width: 100%;
  height: auto;
  margin: 0.9em 0;
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 6px;
}

.preview-markdown-wrapper hr {
  margin: 1.6em 0;
  border: none;
  border-top: 1px solid var(--el-border-color, #dcdfe6);
}
</style>
