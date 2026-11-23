<script setup lang="ts">
import type { MarkdownHeading } from '@/shared/utils/markdown'

defineProps<{ headings: MarkdownHeading[] }>()
</script>

<template>
  <nav class="toc" aria-label="文内目录">
    <p class="toc__title">本文目录</p>
    <ol class="toc__list">
      <li
        v-for="heading in headings"
        :key="heading.id"
        class="toc__item"
        :class="{ 'toc__item--sub': heading.level === 3 }"
      >
        <a :href="`#${heading.id}`" class="toc__link">{{ heading.text }}</a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.toc {
  position: sticky;
  top: var(--space-5);
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: calc(100dvh - 48px);
  padding-left: var(--space-4);
  overflow-y: auto;
  border-left: 1px solid var(--color-border);
}

.toc__title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.toc__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc__item--sub {
  padding-left: var(--space-3);
}

.toc__link {
  display: block;
  padding: 3px 0;
  font-size: var(--font-size-sm);
  line-height: 1.45;
  color: var(--color-text-muted);
}

.toc__link:hover {
  color: var(--color-accent-text);
}
</style>
