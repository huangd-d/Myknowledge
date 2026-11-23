<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import KnowledgeCard from '../components/KnowledgeCard.vue'
import { knowledgeCategories, knowledgeDocs, knowledgeStats } from '../data'
import type { KnowledgeCategory } from '../types'

const keyword = ref('')

const filtered = computed<KnowledgeCategory[]>(() => {
  const term = keyword.value.trim().toLowerCase()
  if (!term) return knowledgeCategories
  return knowledgeCategories
    .map((category) => ({
      ...category,
      docs: category.docs.filter((doc) =>
        `${doc.title} ${doc.summary} ${doc.categoryLabel} ${doc.body}`.toLowerCase().includes(term),
      ),
    }))
    .filter((category) => category.docs.length > 0)
})

const hitCount = computed(() => filtered.value.reduce((sum, category) => sum + category.docs.length, 0))
</script>

<template>
  <div class="kb">
    <header class="kb__head">
      <p class="kb__eyebrow">知识库</p>
      <h1 class="kb__title">把结论写下来，比记住它更可靠</h1>
      <p class="kb__lead">
        仓库里的 Markdown 会被自动收录：<code>skills/**/*.md</code> 与
        <code>knowledge/**/*.md</code>。新增一篇文档，刷新页面即可看到。
      </p>
      <div class="kb__meta">
        <span>{{ knowledgeStats.docCount }} 篇文档</span>
        <span aria-hidden="true">·</span>
        <span>{{ knowledgeStats.categoryCount }} 个分类</span>
        <span aria-hidden="true">·</span>
        <span>约 {{ knowledgeStats.totalReadMinutes }} 分钟读完</span>
      </div>
    </header>

    <div class="kb__search">
      <input
        v-model="keyword"
        type="search"
        class="kb__input"
        placeholder="搜索标题、正文或分类…"
        aria-label="搜索知识库"
      />
      <span class="kb__hit">{{ hitCount }} 条</span>
    </div>

    <section v-for="category in filtered" :key="category.key" class="cat">
      <header class="cat__head">
        <h2 class="cat__title">{{ category.title }}</h2>
        <p class="cat__summary">{{ category.summary }}</p>
        <span class="cat__count">{{ category.docs.length }}</span>
      </header>
      <div class="cat__grid">
        <KnowledgeCard v-for="doc in category.docs" :key="doc.id" :doc="doc" />
      </div>
    </section>

    <EmptyState
      v-if="filtered.length === 0"
      title="没有匹配的文档"
      :description="`没有找到包含「${keyword.trim()}」的内容，换个关键词试试。`"
    >
      <button type="button" class="kb__reset" @click="keyword = ''">清空搜索</button>
    </EmptyState>

    <p v-if="knowledgeDocs.length === 0" class="kb__hint">
      还没有任何文档：在 <code>knowledge/</code> 目录下新建一个 <code>.md</code> 文件即可。
    </p>
  </div>
</template>

<style scoped>
.kb {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.kb__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.kb__eyebrow {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-accent-text);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kb__title {
  font-size: var(--font-size-2xl);
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.kb__lead {
  max-width: 62ch;
  color: var(--color-text-muted);
}

.kb__lead code,
.kb__hint code {
  padding: 0.1em 0.35em;
  font-size: 0.88em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.kb__meta {
  display: flex;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.kb__search {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.kb__input {
  flex: 1;
  padding: var(--space-2) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.kb__input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.kb__hit {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.cat {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cat__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  align-items: baseline;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.cat__title {
  font-size: var(--font-size-lg);
  font-weight: 650;
}

.cat__summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.cat__count {
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
  background: var(--color-surface-2);
  border-radius: var(--radius-pill);
}

.cat__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.kb__reset {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
}

.kb__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
