<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '@/shared/ui/EmptyState.vue'
import MarkdownBody from '@/shared/ui/MarkdownBody.vue'
import { renderMarkdown } from '@/shared/utils/markdown'
import KnowledgeToc from '../components/KnowledgeToc.vue'
import { findCollection, findDoc } from '../data'

const route = useRoute()

const collectionKey = computed(() => String(route.params.collection ?? ''))
const collection = computed(() => findCollection(collectionKey.value))
const doc = computed(() => findDoc(collectionKey.value, String(route.params.slug ?? '')))
const rendered = computed(() => renderMarkdown(doc.value?.body ?? ''))
const toc = computed(() => rendered.value.headings.filter((heading) => heading.level <= 3))

const siblings = computed(() => {
  const list = collection.value?.docs ?? []
  const index = list.findIndex((item) => item.id === doc.value?.id)
  return {
    prev: index > 0 ? list[index - 1] : undefined,
    next: index >= 0 ? list[index + 1] : undefined,
  }
})
</script>

<template>
  <article v-if="doc && collection" class="doc">
    <header class="doc__head">
      <nav class="crumbs" aria-label="面包屑">
        <RouterLink to="/kb" class="crumbs__link">知识库</RouterLink>
        <span class="crumbs__sep" aria-hidden="true">/</span>
        <RouterLink :to="`/kb/${collection.key}`" class="crumbs__link">{{ collection.title }}</RouterLink>
      </nav>
      <h1 class="doc__title">{{ doc.title }}</h1>
      <p class="doc__meta">
        {{ doc.path }} · {{ doc.charCount }} 字 · 约 {{ doc.readMinutes }} 分钟
      </p>
    </header>

    <div class="doc__body">
      <MarkdownBody :html="rendered.html" />
      <aside class="doc__aside">
        <KnowledgeToc v-if="toc.length > 1" :headings="toc" />
      </aside>
    </div>

    <footer class="doc__foot">
      <RouterLink
        v-if="siblings.prev"
        :to="`/kb/${collection.key}/${siblings.prev.slug}`"
        class="pager"
      >
        <span class="pager__label">← 上一篇</span>
        <span class="pager__title">{{ siblings.prev.title }}</span>
      </RouterLink>
      <span v-else class="pager pager--empty" />

      <RouterLink
        v-if="siblings.next"
        :to="`/kb/${collection.key}/${siblings.next.slug}`"
        class="pager pager--next"
      >
        <span class="pager__label">下一篇 →</span>
        <span class="pager__title">{{ siblings.next.title }}</span>
      </RouterLink>
      <span v-else class="pager pager--empty" />
    </footer>
  </article>

  <EmptyState
    v-else
    title="文档不存在"
    :description="`没有找到「${String(route.params.collection ?? '')} / ${String(route.params.slug ?? '')}」，可能已经被重命名或移动。`"
  >
    <RouterLink to="/kb" class="crumbs__link">返回知识库</RouterLink>
  </EmptyState>
</template>

<style scoped>
.doc {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.doc__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.crumbs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-size: var(--font-size-sm);
}

.crumbs__link {
  color: var(--color-text-muted);
}

.crumbs__link:hover {
  color: var(--color-accent-text);
}

.crumbs__sep {
  color: var(--color-text-faint);
}

.doc__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.doc__meta {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.doc__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  gap: var(--space-6);
}

.doc__aside {
  min-width: 0;
}

.doc__foot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.pager {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease;
}

.pager:hover {
  border-color: var(--color-accent);
}

.pager--next {
  align-items: flex-end;
  text-align: right;
}

.pager--empty {
  border-color: transparent;
}

.pager__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.pager__title {
  font-size: var(--font-size-sm);
  font-weight: 550;
}

@media (max-width: 1080px) {
  .doc__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .doc__aside {
    display: none;
  }

  .doc__title {
    font-size: var(--font-size-2xl);
  }
}
</style>
