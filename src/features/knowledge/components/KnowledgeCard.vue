<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { KnowledgeDoc } from '../types'

defineProps<{ doc: KnowledgeDoc }>()
</script>

<template>
  <RouterLink :to="`/kb/${doc.id}`" class="card">
    <div class="card__top">
      <span class="card__chip">{{ doc.categoryLabel }}</span>
      <span class="card__time">{{ doc.readMinutes }} 分钟</span>
    </div>
    <h3 class="card__title">{{ doc.title }}</h3>
    <p class="card__summary">{{ doc.summary }}</p>
    <span class="card__path">{{ doc.path }}</span>
  </RouterLink>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.card__top {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
}

.card__chip {
  padding: 2px var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-pill);
}

.card__time {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.card__title {
  font-size: var(--font-size-md);
  font-weight: 600;
  line-height: 1.4;
}

.card__summary {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.card__path {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
