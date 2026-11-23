<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { caseList } from '@/features/cases/registry'
import ThemeToggle from '@/shared/ui/ThemeToggle.vue'

const navItems = [
  { to: '/', label: '工作台', hint: '概览与入口' },
  { to: '/kb', label: '知识库', hint: '合集与文档' },
  { to: '/cases', label: '实验案例', hint: '可交互示例' },
]

const recentCases = caseList.slice(0, 4)
</script>

<template>
  <div class="shell">
    <aside class="shell__aside">
      <RouterLink to="/" class="brand">
        <span class="brand__mark" aria-hidden="true">M</span>
        <span class="brand__meta">
          <strong class="brand__name">My Knowledge</strong>
          <small class="brand__sub">知识库 · 实验案例</small>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav__link"
          :active-class="item.to === '/' ? '' : 'nav__link--active'"
          exact-active-class="nav__link--active"
        >
          <span class="nav__label">{{ item.label }}</span>
          <span class="nav__hint">{{ item.hint }}</span>
        </RouterLink>
      </nav>

      <section class="quick" aria-labelledby="quick-title">
        <h2 id="quick-title" class="quick__title">最近实验</h2>
        <RouterLink
          v-for="item in recentCases"
          :key="item.id"
          :to="`/cases/${item.id}`"
          class="quick__link"
        >
          {{ item.title }}
        </RouterLink>
      </section>

      <div class="shell__foot">
        <ThemeToggle />
        <span class="shell__version">v0.1.0</span>
      </div>
    </aside>

    <main class="shell__main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--layout-side) minmax(0, 1fr);
  min-height: 100dvh;
}

.shell__aside {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  height: 100dvh;
  padding: var(--space-5) var(--space-4);
  overflow-y: auto;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.brand {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-1) var(--space-2);
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-on-accent);
  background: var(--gradient-brand);
  border-radius: var(--radius-md);
}

.brand__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.brand__name {
  font-size: var(--font-size-md);
}

.brand__sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav__link {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border-left: 2px solid transparent;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav__link:hover {
  background: var(--color-surface-2);
}

.nav__link--active {
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-left-color: var(--color-accent);
}

.nav__label {
  font-size: var(--font-size-md);
  font-weight: 500;
}

.nav__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.quick {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.quick__title {
  margin-bottom: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-faint);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.quick__link {
  padding: var(--space-1) var(--space-2);
  overflow: hidden;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}

.quick__link:hover {
  color: var(--color-accent-text);
  background: var(--color-surface-2);
}

.shell__foot {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.shell__version {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.shell__main {
  min-width: 0;
  padding: var(--space-6) var(--space-6) var(--space-7);
}

.page-enter-active,
.page-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .shell__aside {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
    height: auto;
    padding: var(--space-3) var(--space-4);
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .nav {
    flex-direction: row;
    gap: var(--space-1);
    margin-left: auto;
  }

  .nav__hint,
  .quick,
  .shell__version {
    display: none;
  }

  .nav__link {
    padding: var(--space-1) var(--space-3);
    border-left: none;
  }

  .shell__foot {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .shell__main {
    padding: var(--space-4);
  }
}
</style>
