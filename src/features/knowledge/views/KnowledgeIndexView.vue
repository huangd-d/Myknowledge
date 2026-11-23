<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from '@/shared/ui/EmptyState.vue'
import CollectionCard from '../components/CollectionCard.vue'
import { knowledgeCollections, knowledgeStats } from '../data'
import type { KnowledgeCollection } from '../types'

const keyword = ref('')

const filtered = computed<KnowledgeCollection[]>(() => {
  const term = keyword.value.trim().toLowerCase()
  if (!term) return knowledgeCollections

  return knowledgeCollections
    .map((collection) => {
      const docs = collection.docs.filter((doc) =>
        `${doc.title} ${doc.summary} ${doc.body}`.toLowerCase().includes(term),
      )
      return {
        ...collection,
        docs,
        docCount: docs.length,
        readMinutes: docs.reduce((sum, doc) => sum + doc.readMinutes, 0),
      }
    })
    .filter((collection) => collection.docCount > 0)
})

const hitCount = computed(() => filtered.value.reduce((sum, item) => sum + item.docCount, 0))
</script>

<template>
  <div class="kb">
    <header class="kb__head">
      <p class="kb__eyebrow">知识库</p>
      <h1 class="kb__title">把结论写下来，比记住它更可靠</h1>
      <p class="kb__lead">
        内容放在 <code>src/content/&lt;合集&gt;/</code> 下，一个合集一个目录，一篇概念一个文件。新增
        <code>.md</code> 后刷新页面即可看到，不需要改代码。
      </p>
      <div class="kb__meta">
        <span>{{ knowledgeStats.collectionCount }} 个合集</span>
        <span aria-hidden="true">·</span>
        <span>{{ knowledgeStats.docCount }} 篇文档</span>
        <span aria-hidden="true">·</span>
        <span>约 {{ knowledgeStats.totalReadMinutes }} 分钟读完</span>
      </div>
    </header>

    <div class="kb__search">
      <input
        v-model="keyword"
        type="search"
        class="kb__input"
        placeholder="搜索标题、正文或合集…"
        aria-label="搜索知识库"
      />
      <span class="kb__hit">{{ hitCount }} 条</span>
    </div>

    <div class="kb__grid">
      <CollectionCard v-for="collection in filtered" :key="collection.key" :collection="collection" />
    </div>

    <EmptyState
      v-if="filtered.length === 0"
      title="没有匹配的内容"
      :description="`没有找到包含「${keyword.trim()}」的文档，换个关键词试试。`"
    >
      <button type="button" class="kb__reset" @click="keyword = ''">清空搜索</button>
    </EmptyState>
  </div>
</template>

<style scoped>
.kb {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
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
  max-width: 66ch;
  color: var(--color-text-muted);
}

.kb__lead code {
  padding: 0.1em 0.35em;
  font-size: 0.88em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.kb__meta {
  display: flex;
  flex-wrap: wrap;
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

.kb__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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
</style>
