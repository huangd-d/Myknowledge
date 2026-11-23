<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { CaseMeta } from '../registry'

defineProps<{ item: CaseMeta }>()
</script>

<template>
  <RouterLink :to="`/cases/${item.id}`" class="case">
    <div class="case__top">
      <span class="case__level" :data-level="item.level">{{ item.level }}</span>
      <span class="case__arrow" aria-hidden="true">→</span>
    </div>
    <h3 class="case__title">{{ item.title }}</h3>
    <p class="case__summary">{{ item.summary }}</p>
    <ul class="case__tags">
      <li v-for="tag in item.tags" :key="tag" class="case__tag">{{ tag }}</li>
    </ul>
  </RouterLink>
</template>

<style scoped>
.case {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.case:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.case__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.case__level {
  padding: 1px var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border-radius: var(--radius-pill);
}

.case__level[data-level='进阶'] {
  color: var(--color-warning);
  background: var(--color-warning-soft);
}

.case__arrow {
  color: var(--color-text-faint);
  transition: transform 0.15s ease;
}

.case:hover .case__arrow {
  color: var(--color-accent-text);
  transform: translateX(2px);
}

.case__title {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.case__summary {
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.case__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.case__tag {
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-faint);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
</style>
