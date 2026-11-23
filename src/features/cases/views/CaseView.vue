<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '@/shared/ui/EmptyState.vue'
import { findCaseById } from '../registry'

const route = useRoute()

const meta = computed(() => findCaseById(String(route.params.id ?? '')))
const demo = computed(() => (meta.value ? defineAsyncComponent(meta.value.loader) : null))
</script>

<template>
  <div v-if="meta" class="case">
    <header class="case__head">
      <RouterLink to="/cases" class="case__back">← 返回案例列表</RouterLink>
      <div class="case__tags">
        <span class="case__level">{{ meta.level }}</span>
        <span v-for="tag in meta.tags" :key="tag" class="case__tag">{{ tag }}</span>
      </div>
      <h1 class="case__title">{{ meta.title }}</h1>
      <p class="case__summary">{{ meta.summary }}</p>
    </header>

    <section class="case__panel" aria-labelledby="takeaways-title">
      <h2 id="takeaways-title" class="case__panel-title">要验证的结论</h2>
      <ul class="case__list">
        <li v-for="item in meta.takeaways" :key="item">{{ item }}</li>
      </ul>
    </section>

    <section class="case__demo" aria-label="交互演示">
      <component :is="demo" v-if="demo" />
    </section>

    <footer class="case__foot">
      <p class="case__hint">
        源码：<code>src/features/cases/demos/{{ meta.id }}/</code>
      </p>
      <RouterLink to="/cases" class="case__back">← 返回案例列表</RouterLink>
    </footer>
  </div>

  <EmptyState
    v-else
    title="案例不存在"
    :description="`没有找到 id 为「${String(route.params.id ?? '')}」的实验案例。`"
  >
    <RouterLink to="/cases" class="case__back">返回案例列表</RouterLink>
  </EmptyState>
</template>

<style scoped>
.case {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.case__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.case__back {
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.case__back:hover {
  color: var(--color-accent-text);
}

.case__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
}

.case__level {
  padding: 1px var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-pill);
}

.case__tag {
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-faint);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.case__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.case__summary {
  max-width: 68ch;
  color: var(--color-text-muted);
}

.case__panel {
  padding: var(--space-4);
  background: var(--color-accent-soft);
  border-radius: var(--radius-md);
}

.case__panel-title {
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-accent-text);
}

.case__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: 1.2em;
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  list-style: disc;
}

.case__demo {
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.case__foot {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.case__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.case__hint code {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
}

@media (max-width: 720px) {
  .case__title {
    font-size: var(--font-size-2xl);
  }

  .case__demo {
    padding: var(--space-4);
  }
}
</style>
