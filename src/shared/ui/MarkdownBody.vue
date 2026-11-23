<script setup lang="ts">
// frontend-rules-ignore: security/v-html
// 原因：html 由 shared/utils/markdown 生成，所有文本均已 HTML 转义，不接受用户输入；负责人：@me
defineProps<{ html: string }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- 内容已转义，见上方豁免说明 -->
  <article class="prose" v-html="html" />
</template>

<style scoped>
/* 需要 :deep() 的原因：v-html 渲染出的节点不带 scope id，只能用后代选择器命中。
   内容来自本地 Markdown（已转义），这里的 :deep() 不是为了覆盖第三方组件，而是为了穿透 v-html。 */
.prose {
  max-width: 76ch;
  font-size: 15px;
  line-height: 1.78;
  color: var(--color-text);
  word-break: break-word;
}

.prose :deep(> :first-child) {
  margin-top: 0;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin: 2.1em 0 0.7em;
  font-weight: 650;
  line-height: 1.35;
  scroll-margin-top: 88px;
}

.prose :deep(h1) {
  margin-top: 0;
  font-size: var(--font-size-2xl);
  letter-spacing: -0.01em;
}

.prose :deep(h2) {
  padding-bottom: 0.4em;
  font-size: var(--font-size-xl);
  border-bottom: 1px solid var(--color-border);
}

.prose :deep(h3) {
  font-size: var(--font-size-lg);
}

.prose :deep(h4) {
  font-size: var(--font-size-md);
  color: var(--color-text-muted);
}

.prose :deep(p) {
  margin: 0 0 1em;
}

.prose :deep(a) {
  color: var(--color-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: var(--color-accent-soft);
}

.prose :deep(a:hover) {
  text-decoration-color: currentColor;
}

.prose :deep(strong) {
  font-weight: 650;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin: 0 0 1em;
  padding-left: 1.4em;
}

.prose :deep(ul) {
  list-style: disc;
}

.prose :deep(ol) {
  list-style: decimal;
}

.prose :deep(li) {
  margin: 0.3em 0;
}

.prose :deep(li > p) {
  margin: 0;
}

.prose :deep(.nested) {
  margin: 0.3em 0 0;
  padding-left: 1.2em;
  list-style: circle;
}

.prose :deep(blockquote) {
  margin: 0 0 1em;
  padding: 0.6em 1em;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border-left: 3px solid var(--color-border-strong);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.prose :deep(hr) {
  height: 1px;
  margin: 2em 0;
  background: var(--color-border);
  border: 0;
}

.prose :deep(code) {
  padding: 0.15em 0.4em;
  font-size: 0.88em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.prose :deep(pre.code) {
  position: relative;
  margin: 0 0 1.2em;
  padding: var(--space-4);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.65;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.prose :deep(pre.code code) {
  padding: 0;
  font-size: inherit;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.prose :deep(pre.code[data-lang]) {
  padding-top: 2em;
}

.prose :deep(pre.code[data-lang])::before {
  position: absolute;
  top: 0;
  left: 0;
  padding: 2px 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-faint);
  content: attr(data-lang);
  background: var(--color-surface-2);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  border-radius: var(--radius-md) 0 var(--radius-sm) 0;
}

.prose :deep(.table-wrap) {
  margin: 0 0 1.2em;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.prose :deep(table) {
  min-width: 480px;
  font-size: var(--font-size-sm);
}

.prose :deep(th),
.prose :deep(td) {
  padding: 0.55em 0.9em;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}

.prose :deep(th) {
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  background: var(--color-surface-2);
}

.prose :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.prose :deep(tbody tr:hover) {
  background: var(--color-surface-2);
}

@media (max-width: 720px) {
  .prose {
    font-size: 14px;
  }
}
</style>
