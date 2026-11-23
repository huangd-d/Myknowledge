<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { caseStats } from '@/features/cases/registry'
import { knowledgeStats } from '@/features/knowledge/data'
</script>

<template>
  <header class="hero">
    <p class="hero__eyebrow">Workbench</p>
    <h1 class="hero__title">My Knowledge</h1>
    <p class="hero__lead">
      一个用路由组织的个人知识库：左边是写下来的结论，右边是能跑起来验证的实验。所有内容都来自仓库里的
      Markdown 与 <code>src/features</code> 下的代码，没有隐藏的后台。
    </p>
    <div class="hero__stats">
      <span><strong>{{ knowledgeStats.docCount }}</strong> 篇文档</span>
      <span><strong>{{ caseStats.total }}</strong> 个实验</span>
      <span><strong>{{ knowledgeStats.totalReadMinutes }}</strong> 分钟阅读</span>
    </div>

    <div class="entries">
      <RouterLink to="/kb" class="entry">
        <span class="entry__icon" aria-hidden="true">▤</span>
        <span class="entry__body">
          <span class="entry__title">知识库</span>
          <span class="entry__desc">
            {{ knowledgeStats.categoryCount }} 个分类，{{ knowledgeStats.docCount }} 篇文档，支持关键词检索
          </span>
        </span>
        <span class="entry__arrow" aria-hidden="true">→</span>
      </RouterLink>

      <RouterLink to="/cases" class="entry">
        <span class="entry__icon" aria-hidden="true">▷</span>
        <span class="entry__body">
          <span class="entry__title">实验案例</span>
          <span class="entry__desc">
            {{ caseStats.tags.slice(0, 3).join(' / ') }} 等 {{ caseStats.total }} 个案例，每个只验证一个结论
          </span>
        </span>
        <span class="entry__arrow" aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.hero__eyebrow {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent-text);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.hero__lead {
  max-width: 66ch;
  color: var(--color-text-muted);
}

.hero__lead code {
  padding: 0.1em 0.35em;
  font-size: 0.88em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.hero__stats strong {
  font-family: var(--font-mono);
  font-size: var(--font-size-lg);
  color: var(--color-text);
}

.entries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.entry {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.entry:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}

.entry__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: var(--font-size-lg);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-sm);
}

.entry__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.entry__title {
  font-weight: 600;
}

.entry__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.entry__arrow {
  color: var(--color-text-faint);
}
</style>
