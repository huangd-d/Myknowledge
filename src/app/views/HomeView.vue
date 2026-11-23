<script setup lang="ts">
import { RouterLink } from 'vue-router'
import HomeHero from '../components/HomeHero.vue'
import HomeHowTo from '../components/HomeHowTo.vue'
import { caseList } from '@/features/cases/registry'
import { documentPath, knowledgeDocs } from '@/features/knowledge/data'

const recentDocs = knowledgeDocs.slice(0, 4)
const featuredCases = caseList.slice(0, 3)
</script>

<template>
  <div class="home">
    <HomeHero />

    <div class="columns">
      <section class="panel">
        <header class="panel__head">
          <h2 class="panel__title">最近文档</h2>
          <RouterLink to="/kb" class="panel__more">全部 →</RouterLink>
        </header>
        <ul class="list">
          <li v-for="doc in recentDocs" :key="doc.id">
            <RouterLink :to="documentPath(doc)" class="list__row">
              <span class="list__title">{{ doc.title }}</span>
              <span class="list__meta">{{ doc.collectionTitle }} · {{ doc.readMinutes }} 分钟</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="panel">
        <header class="panel__head">
          <h2 class="panel__title">精选案例</h2>
          <RouterLink to="/cases" class="panel__more">全部 →</RouterLink>
        </header>
        <ul class="list">
          <li v-for="item in featuredCases" :key="item.id">
            <RouterLink :to="`/cases/${item.id}`" class="list__row">
              <span class="list__title">{{ item.title }}</span>
              <span class="list__meta">{{ item.level }} · {{ item.tags.join(' / ') }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>

    <HomeHowTo />
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-width: var(--layout-content);
  margin: 0 auto;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-3);
}

.panel {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: var(--space-2);
  margin-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.panel__title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.panel__more {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.panel__more:hover {
  color: var(--color-accent-text);
}

.list {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
}

.list__row {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-2) var(--space-1);
  border-radius: var(--radius-sm);
}

.list__row:hover {
  background: var(--color-surface-2);
}

.list__title {
  overflow: hidden;
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}
</style>
