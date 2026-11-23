<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="notfound">
    <p class="notfound__code">404</p>
    <h1 class="notfound__title">这个地址没有对应的页面</h1>
    <p class="notfound__desc">
      可能链接过期了，或者内容已经被移动。可以去知识库或实验案例里找找。
    </p>
    <div class="notfound__actions">
      <RouterLink to="/" class="notfound__btn notfound__btn--primary">回到工作台</RouterLink>
      <RouterLink to="/kb" class="notfound__btn">知识库</RouterLink>
      <RouterLink to="/cases" class="notfound__btn">实验案例</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.notfound {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
  max-width: 620px;
  padding: var(--space-7) 0;
  margin: 0 auto;
}

.notfound__code {
  font-family: var(--font-mono);
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent-soft);
}

.notfound__title {
  font-size: var(--font-size-xl);
  font-weight: 650;
}

.notfound__desc {
  color: var(--color-text-muted);
}

.notfound__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.notfound__btn {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.notfound__btn:hover {
  border-color: var(--color-accent);
}

.notfound__btn--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
  border-color: transparent;
}
</style>
