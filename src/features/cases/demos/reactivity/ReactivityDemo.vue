<script setup lang="ts">
import { computed, onUpdated, reactive, ref, shallowRef, triggerRef, watch } from 'vue'

const count = ref(0)
const deep = reactive({ nested: { value: 0 } })
const shallow = shallowRef({ nested: { value: 0 } })
const doubled = computed(() => count.value * 2)

/**
 * 更新次数用 DOM 直接写，避免「写入响应式数据 → 触发更新 → 再写入」的死循环。
 * 这也是排查渲染次数的常用手法。
 */
const renderBadge = ref<HTMLElement | null>(null)
let renderTimes = 0
onUpdated(() => {
  renderTimes += 1
  if (renderBadge.value) renderBadge.value.textContent = String(renderTimes)
})

const logs = ref<string[]>([])
function log(message: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [`${time}  ${message}`, ...logs.value].slice(0, 8)
}

watch(count, (value) => log(`ref 更新 → ${value}`))
watch(
  () => deep.nested.value,
  (value) => log(`reactive 深层更新 → ${value}`),
)
watch(shallow, (value) => log(`shallowRef 被整体替换 → ${value.nested.value}`))

function replaceShallow() {
  shallow.value = { nested: { value: shallow.value.nested.value + 1 } }
}

function forceUpdate() {
  triggerRef(shallow)
}
</script>

<template>
  <div class="lab">
    <header class="lab__head">
      <p class="lab__meta">
        组件更新次数
        <span ref="renderBadge" class="lab__badge">0</span>
        <span class="lab__hint">（改 shallowRef 的深层字段时它不会动）</span>
      </p>
    </header>

    <div class="lab__grid">
      <section class="panel">
        <p class="panel__tag">ref</p>
        <p class="panel__value">{{ count }}</p>
        <p class="panel__desc">原始值 / 任意类型，访问要写 .value</p>
        <div class="panel__actions">
          <button type="button" class="btn" @click="count += 1">+1</button>
          <button type="button" class="btn" @click="count = 0">重置</button>
        </div>
      </section>

      <section class="panel">
        <p class="panel__tag">reactive</p>
        <p class="panel__value">{{ deep.nested.value }}</p>
        <p class="panel__desc">对象深层属性也是响应式的，改嵌套会更新</p>
        <div class="panel__actions">
          <button type="button" class="btn" @click="deep.nested.value += 1">深层 +1</button>
        </div>
      </section>

      <section class="panel panel--muted">
        <p class="panel__tag">shallowRef</p>
        <p class="panel__value">{{ shallow.nested.value }}</p>
        <p class="panel__desc">只有整体替换 .value 才触发更新</p>
        <div class="panel__actions">
          <button type="button" class="btn" @click="shallow.nested.value += 1">深层 +1（不更新）</button>
          <button type="button" class="btn btn--primary" @click="replaceShallow">
            整体替换（更新）
          </button>
          <button type="button" class="btn" @click="forceUpdate">手动 triggerRef</button>
        </div>
      </section>
    </div>

    <div class="lab__footer">
      <div class="lab__derived">
        <span class="lab__derived-label">computed</span>
        <span>doubled = {{ doubled }}</span>
        <span class="lab__hint">只依赖 count，count 不变就不会重新计算</span>
      </div>
      <ul class="lab__log">
        <li v-for="(line, index) in logs" :key="index" class="lab__log-item">{{ line }}</li>
        <li v-if="logs.length === 0" class="lab__log-item lab__log-item--empty">
          点上面的按钮，这里会记录每次 watch 命中
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.lab {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lab__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.lab__badge {
  padding: 0 var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-radius: var(--radius-sm);
}

.lab__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.lab__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.panel--muted {
  border-style: dashed;
}

.panel__tag {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
}

.panel__value {
  font-family: var(--font-mono);
  font-size: var(--font-size-3xl);
  font-weight: 600;
  line-height: 1.1;
}

.panel__desc {
  font-size: var(--font-size-xs);
  line-height: 1.5;
  color: var(--color-text-muted);
}

.panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-2);
}

.btn {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.btn:hover {
  border-color: var(--color-accent);
}

.btn--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
  border-color: transparent;
}

.lab__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 1fr);
  gap: var(--space-3);
}

.lab__derived {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: baseline;
  padding: var(--space-3);
  font-size: var(--font-size-sm);
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
}

.lab__derived-label {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-accent-text);
}

.lab__log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  margin: 0;
  list-style: none;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.lab__log-item {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  line-height: 1.7;
  color: var(--color-text-muted);
}

.lab__log-item--empty {
  font-family: var(--font-sans);
  color: var(--color-text-faint);
}

@media (max-width: 720px) {
  .lab__footer {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
