<template>
  <section class="howto">
    <h2 class="howto__title">怎么往里加东西</h2>
    <ol class="howto__steps">
      <li class="howto__step">
        <span class="howto__index">1</span>
        <div>
          <p class="howto__step-title">写一篇笔记</p>
          <p class="howto__step-desc">
            在 <code>knowledge/</code> 下新建 <code>xxx.md</code>，可选 frontmatter
            <code>title</code> / <code>description</code>，刷新即出现在知识库。
          </p>
        </div>
      </li>
      <li class="howto__step">
        <span class="howto__index">2</span>
        <div>
          <p class="howto__step-title">加一个实验</p>
          <p class="howto__step-desc">
            在 <code>src/features/cases/demos/&lt;id&gt;/</code> 建一个自包含组件，再到
            <code>registry.ts</code> 注册一条元数据，路由会自动出现。
          </p>
        </div>
      </li>
      <li class="howto__step">
        <span class="howto__index">3</span>
        <div>
          <p class="howto__step-title">写规范本身也在这里</p>
          <p class="howto__step-desc">
            <code>skills/vue3-ts-vite-frontend/</code> 是正在执行的规范，本项目的目录结构就是它的示例。
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.howto {
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.howto__title {
  margin-bottom: var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: 650;
}

.howto__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

.howto__step {
  display: flex;
  gap: var(--space-3);
}

.howto__index {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: 50%;
}

.howto__step-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.howto__step-desc {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.howto__step-desc code {
  padding: 0.1em 0.35em;
  font-size: 0.9em;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}
</style>
