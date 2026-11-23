<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { findCollection } from '../data'

const route = useRoute()
const collection = computed(() => findCollection(String(route.params.collection ?? '')))
</script>

<template>
  <div v-if="collection" class="collection">
    <header class="collection__head">
      <RouterLink to="/kb" class="collection__back">← 返回知识库</RouterLink>
      <h1 class="collection__title">{{ collection.title }}</h1>
      <p class="collection__summary">{{ collection.summary }}</p>
      <p class="collection__meta">
        {{ collection.docCount }} 篇 · 约 {{ collection.readMinutes }} 分钟 ·
        <code>src/content/{{ collection.key }}/</code>
      </p>
    </header>

    <ol class="docs">
      <li v-for="doc in collection.docs" :key="doc.id" class="docs__item">
        <RouterLink :to="`/kb/${collection.key}/${doc.slug}`" class="row">
          <span class="row__index">{{ String(doc.order).padStart(2, '0') }}</span>
          <span class="row__body">
            <span class="row__title">{{ doc.title }}</span>
            <span class="row__summary">{{ doc.summary }}</span>
          </span>
          <span class="row__time">{{ doc.readMinutes }} 分钟</span>
        </RouterLink>
      </li>
    </ol>
  </div>

  <EmptyState
    v-else
    title="合集不存在"
    :description="`没有找到「${String(route.params.collection ?? '')}」这个合集。`"
  >
    <RouterLink to="/kb" class="collection__back">返回知识库</RouterLink>
  </EmptyState>
</template>

<style scoped>
.collection {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.collection__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.collection__back {
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.collection__back:hover {
  color: var(--color-accent-text);
}

.collection__title {
  font-size: var(--font-size-2xl);
  font-weight: 680;
  letter-spacing: -0.01em;
}

.collection__summary {
  max-width: 70ch;
  color: var(--color-text-muted);
}

.collection__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.collection__meta code {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

.docs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.row {
  display: flex;
  gap: var(--space-3);
  align-items: baseline;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.row:hover {
  background: var(--color-surface);
}

.row__index {
  flex: none;
  width: 28px;
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.row__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.row__title {
  font-size: var(--font-size-md);
  font-weight: 550;
}

.row__summary {
  overflow: hidden;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__time {
  flex: none;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

@media (max-width: 720px) {
  .row__summary,
  .row__time {
    display: none;
  }
}
</style>
