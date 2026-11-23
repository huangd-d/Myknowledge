<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '@/shared/ui/EmptyState.vue'
import MarkdownBody from '@/shared/ui/MarkdownBody.vue'
import { renderMarkdown } from '@/shared/utils/markdown'
import KnowledgeToc from '../components/KnowledgeToc.vue'
import { findDocById } from '../data'

const route = useRoute()

const doc = computed(() => findDocById(String(route.params.id ?? '')))
const rendered = computed(() => renderMarkdown(doc.value?.body ?? ''))
const toc = computed(() => rendered.value.headings.filter((heading) => heading.level <= 3))
</script>

<template>
  <article v-if="doc" class="doc">
    <header class="doc__head">
      <RouterLink to="/kb" class="doc__back">← 返回知识库</RouterLink>
      <div class="doc__tags">
        <span class="doc__chip">{{ doc.categoryLabel }}</span>
        <span class="doc__path">{{ doc.path }}</span>
      </div>
      <h1 class="doc__title">{{ doc.title }}</h1>
      <p class="doc__meta">
        {{ doc.charCount }} 字 · 约 {{ doc.readMinutes }} 分钟 · {{ toc.length }} 个小节
      </p>
    </header>

    <div class="doc__body">
      <MarkdownBody :html="rendered.html" />
      <aside class="doc__aside">
        <KnowledgeToc v-if="toc.length > 1" :headings="toc" />
      </aside>
    </div>

    <footer class="doc__foot">
      <RouterLink to="/kb" class="doc__back">← 返回知识库</RouterLink>
    </footer>
  </article>

  <EmptyState
    v-else
    title="文档不存在"
    :description="`没有找到 id 为「${String(route.params.id ?? '')}」的文档，可能已经被重命名或移动。`"
  >
    <RouterLink to="/kb" class="doc__back">返回知识库</RouterLink>
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

.doc__back {
  align-self: flex-start;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.doc__back:hover {
  color: var(--color-accent-text);
}

.doc__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.doc__chip {
  padding: 2px var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-pill);
}

.doc__path {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.doc__title {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.doc__meta {
  font-size: var(--font-size-sm);
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
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
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
