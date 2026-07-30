<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeaderHero from '@/components/layout/PageHeaderHero.vue'
import { useRagStore } from '@/store/modules/rag'
import { fetchGroups } from '@/api/rag/group'
import { fetchEntities, fetchGraphTypes, type EntityListItem } from '@/api/rag/graph'
import { extractErrorMessage } from '@/utils/request'
import EntityDetailDrawer from '../components/EntityDetailDrawer.vue'

defineOptions({ name: 'GraphEntityListView' })

const appStore = useRagStore()

const groupsLoading = ref(false)
const selectedGroupId = ref<number | null>(appStore.currentGroupId)

const keyword = ref('')
const selectedType = ref('')
const types = ref<string[]>([])

const loading = ref(false)
const items = ref<EntityListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const drawerVisible = ref(false)
const drawerEntityName = ref<string | null>(null)

async function loadGroups() {
  groupsLoading.value = true
  try {
    const result = await fetchGroups()
    appStore.applyGroupQueryResult(result)
    if (
      selectedGroupId.value === null ||
      !appStore.visibleGroups.some((g) => g.groupId === selectedGroupId.value)
    ) {
      selectedGroupId.value = appStore.currentGroupId ?? appStore.visibleGroups[0]?.groupId ?? null
    }
  } catch {
    ElMessage.error('加载群组失败')
  } finally {
    groupsLoading.value = false
  }
}

async function loadTypes() {
  if (selectedGroupId.value === null) return
  try {
    types.value = await fetchGraphTypes(selectedGroupId.value)
  } catch {
    types.value = []
  }
}

async function loadEntities() {
  if (selectedGroupId.value === null) return
  loading.value = true
  try {
    const result = await fetchEntities(selectedGroupId.value, {
      keyword: keyword.value.trim() || undefined,
      type: selectedType.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    items.value = result.items
    total.value = result.total
  } catch (error) {
    ElMessage.error(extractErrorMessage(error))
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadEntities()
}

function handleReset() {
  keyword.value = ''
  selectedType.value = ''
  page.value = 1
  loadEntities()
}

function handleRowClick(row: EntityListItem) {
  drawerEntityName.value = row.name
  drawerVisible.value = true
}

function handlePageChange(newPage: number) {
  page.value = newPage
  loadEntities()
}

function handleSizeChange(newSize: number) {
  pageSize.value = newSize
  page.value = 1
  loadEntities()
}

/** 用户通过下拉框切换群组时触发 */
function handleGroupChange() {
  appStore.setCurrentGroupId(selectedGroupId.value)
  selectedType.value = ''
  page.value = 1
  if (selectedGroupId.value !== null) {
    loadTypes()
    loadEntities()
  }
}

onMounted(async () => {
  if (appStore.visibleGroups.length === 0) {
    await loadGroups()
  }
  if (
    selectedGroupId.value === null ||
    !appStore.visibleGroups.some((g) => g.groupId === selectedGroupId.value)
  ) {
    selectedGroupId.value = appStore.currentGroupId ?? appStore.visibleGroups[0]?.groupId ?? null
  }
  if (selectedGroupId.value !== null) {
    loadTypes()
    loadEntities()
  }
})
</script>

<template>
  <div class="entity-list">
    <PageHeaderHero
      eyebrow="KNOWLEDGE GRAPH"
      title="实体检索"
      description="检索知识图谱中的实体，查看其属性、关系与提及切片。"
    />

    <div class="entity-list__filters">
      <el-select
        v-model="selectedGroupId"
        :loading="groupsLoading"
        placeholder="选择知识库群组"
        class="entity-list__group-select"
        @change="handleGroupChange"
      >
        <el-option
          v-for="group in appStore.visibleGroups"
          :key="group.groupId"
          :label="group.groupName"
          :value="group.groupId"
        />
      </el-select>

      <el-input
        v-model="keyword"
        class="entity-list__keyword"
        placeholder="实体名 / 描述关键词"
        clearable
        @keyup.enter="handleSearch"
      />

      <el-select v-model="selectedType" placeholder="全部类型" clearable class="entity-list__type-select">
        <el-option v-for="type in types" :key="type" :label="type" :value="type" />
      </el-select>

      <el-button type="primary" round :loading="loading" @click="handleSearch">查询</el-button>
      <el-button round @click="handleReset">重置</el-button>
    </div>

    <div class="entity-list__table-card">
      <el-table
        v-loading="loading"
        :data="items"
        row-key="name"
        @row-click="handleRowClick"
        class="entity-list__table"
      >
        <el-table-column type="index" label="#" width="56" />
        <el-table-column prop="name" label="实体名" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="entity-list__name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="150">
          <template #default="{ row }">
            <el-tag size="small" effect="light" round>{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="mentionCount" label="提及次数" width="110" sortable>
          <template #default="{ row }">
            <span class="entity-list__mention">{{ row.mentionCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="entity-list__desc">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty
            :description="selectedGroupId === null ? '请先选择知识库群组' : '未检索到实体'"
            :image-size="100"
          />
        </template>
      </el-table>

      <div class="entity-list__pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <EntityDetailDrawer v-model="drawerVisible" :group-id="selectedGroupId" :entity-name="drawerEntityName" />
  </div>
</template>

<style scoped>
.entity-list {
  padding: 0 24px 24px;
}

.entity-list__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}

.entity-list__group-select {
  width: 200px;
}

.entity-list__keyword {
  width: 240px;
}

.entity-list__type-select {
  width: 160px;
}

.entity-list__table-card {
  border-radius: 14px;
  background: var(--surface-white);
  border: 1px solid rgba(15, 23, 42, 0.07);
  padding: 12px 14px 16px;
}

.entity-list__table {
  width: 100%;
}

.entity-list__table :deep(.el-table__row) {
  cursor: pointer;
}

.entity-list__name {
  font-weight: 650;
  color: var(--brand-primary-dark);
}

.entity-list__mention {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.entity-list__desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.entity-list__pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}
</style>
