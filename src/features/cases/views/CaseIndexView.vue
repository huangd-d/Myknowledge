<script setup lang="ts">
import CaseCard from '../components/CaseCard.vue'
import { caseList, caseStats } from '../registry'
</script>

<template>
  <div class="cases">
    <header class="cases__head">
      <p class="cases__eyebrow">实验案例</p>
      <h1 class="cases__title">能点开、能改、能验证的最小实验</h1>
      <p class="cases__lead">
        每个案例只验证一个结论，代码放在 <code>src/features/cases/demos/&lt;id&gt;/</code>，互不引用，删掉一个不影响其他。
      </p>
      <div class="cases__meta">
        <span>{{ caseStats.total }} 个案例</span>
        <span aria-hidden="true">·</span>
        <span>{{ caseStats.tags.slice(0, 4).join(' / ') }} 等</span>
      </div>
    </header>

    <div class="cases__grid">
      <CaseCard v-for="item in caseList" :key="item.id" :item="item" />
    </div>
  </div>
</template>

<style scoped>
.cases {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.cases__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cases__eyebrow {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent-text);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cases__title {
  font-size: var(--font-size-2xl);
  font-weight: 650;
  letter-spacing: -0.01em;
}

.cases__lead {
  max-width: 64ch;
  color: var(--color-text-muted);
}

.cases__lead code {
  padding: 0.1em 0.35em;
  font-size: 0.88em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.cases__meta {
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.cases__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}
</style>
