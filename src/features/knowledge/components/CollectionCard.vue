<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { KnowledgeCollection } from '../types'

defineProps<{ collection: KnowledgeCollection }>()

const PREVIEW_COUNT = 3
</script>

<template>
  <RouterLink :to="`/kb/${collection.key}`" class="collection">
    <div class="collection__head">
      <h2 class="collection__title">{{ collection.title }}</h2>
      <span class="collection__count">{{ collection.docCount }} 篇</span>
    </div>
    <p class="collection__summary">{{ collection.summary }}</p>
    <ul class="collection__docs">
      <li v-for="doc in collection.docs.slice(0, PREVIEW_COUNT)" :key="doc.id" class="collection__doc">
        {{ doc.title }}
      </li>
      <li v-if="collection.docCount > PREVIEW_COUNT" class="collection__doc collection__doc--more">
        还有 {{ collection.docCount - PREVIEW_COUNT }} 篇 · 共 {{ collection.readMinutes }} 分钟
      </li>
    </ul>
  </RouterLink>
</template>

<style scoped>
.collection {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.collection:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.collection:hover .collection__title {
  color: var(--color-accent-text);
}

.collection__head {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  justify-content: space-between;
}

.collection__title {
  font-size: var(--font-size-lg);
  font-weight: 650;
}

.collection__count {
  flex: none;
  padding: 1px var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-pill);
}

.collection__summary {
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.collection__docs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) 0 0;
  margin: 0;
  list-style: none;
  border-top: 1px dashed var(--color-border);
}

.collection__doc {
  overflow: hidden;
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection__doc::before {
  margin-right: var(--space-2);
  color: var(--color-border-strong);
  content: '·';
}

.collection__doc--more {
  color: var(--color-accent-text);
}
</style>
