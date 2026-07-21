<template>
  <div class="page-header-hero">
    <div class="page-header-hero__content">
      <div class="page-header-hero__text">
        <p v-if="eyebrow" class="page-header-hero__eyebrow">{{ eyebrow }}</p>
        <h1 class="page-header-hero__title">{{ title }}</h1>
        <p v-if="description" class="page-header-hero__description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="page-header-hero__actions">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.page-header-hero {
  padding: 24px 0;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.page-header-hero__content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header-hero__eyebrow {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--el-text-color-secondary, #909399);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 4px;
}

.page-header-hero__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--el-text-color-primary, #303133);
  margin: 0 0 8px;
}

.page-header-hero__description {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary, #909399);
  margin: 0;
  line-height: 1.6;
}

.page-header-hero__actions {
  flex-shrink: 0;
}
</style>
