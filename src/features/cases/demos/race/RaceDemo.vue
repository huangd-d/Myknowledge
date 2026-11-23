<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'

type Mode = 'naive' | 'safe'
type RequestId = 'A' | 'B'

interface Result {
  id: RequestId
  cost: number
  at: string
}

const mode = ref<Mode>('naive')
const result = ref<Result | null>(null)
const pending = ref(0)
const logs = ref<string[]>([])

let active: AbortController | null = null

const modeHint = computed(() =>
  mode.value === 'safe'
    ? '安全模式：发新请求前 abort 旧的，旧响应不会再写结果'
    : '裸奔模式：谁最后返回谁说了算，旧响应会覆盖新数据',
)

function log(message: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [`${time}  ${message}`, ...logs.value].slice(0, 8)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

async function request(id: RequestId) {
  const cost = id === 'A' ? 1200 : 200
  const controller = new AbortController()

  if (mode.value === 'safe') {
    active?.abort()
    active = controller
  }

  pending.value += 1
  log(`发出 ${id}（预计 ${cost}ms）`)

  try {
    await sleep(cost, controller.signal)
    result.value = { id, cost, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }) }
    log(`返回 ${id} → 写入结果`)
  } catch {
    log(`${id} 被取消，不写结果`)
  } finally {
    pending.value -= 1
  }
}

// 组件卸载时兜底取消，避免请求回来时往已销毁的组件写状态
onScopeDispose(() => active?.abort())

function reset() {
  active?.abort()
  result.value = null
  pending.value = 0
  logs.value = []
}
</script>

<template>
  <div class="race">
    <div class="race__modes" role="group" aria-label="请求模式">
      <button
        type="button"
        class="race__mode"
        :class="{ 'race__mode--on': mode === 'naive' }"
        @click="mode = 'naive'"
      >
        裸奔模式
      </button>
      <button
        type="button"
        class="race__mode"
        :class="{ 'race__mode--on': mode === 'safe' }"
        @click="mode = 'safe'"
      >
        安全模式（AbortController）
      </button>
      <span class="race__pending">进行中 {{ pending }}</span>
    </div>

    <p class="race__hint">{{ modeHint }}</p>

    <div class="race__actions">
      <button type="button" class="race__btn race__btn--slow" @click="request('A')">
        请求 A（慢 1.2s）
      </button>
      <button type="button" class="race__btn" @click="request('B')">请求 B（快 0.2s）</button>
      <button type="button" class="race__btn race__btn--ghost" @click="reset">清空</button>
    </div>

    <div class="race__result" :class="{ 'race__result--stale': mode === 'naive' && result?.id === 'A' }">
      <p class="race__result-label">当前展示的数据</p>
      <p v-if="result" class="race__result-value">
        {{ result.id }} <span class="race__result-meta">{{ result.cost }}ms · {{ result.at }}</span>
      </p>
      <p v-else class="race__result-value race__result-value--empty">尚未返回</p>
    </div>

    <ol class="race__log">
      <li v-for="(line, index) in logs" :key="index" class="race__log-item">{{ line }}</li>
      <li v-if="logs.length === 0" class="race__log-item race__log-item--empty">
        先点 A，再立刻点 B，观察最终结果
      </li>
    </ol>
  </div>
</template>

<style scoped>
.race {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.race__modes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.race__mode {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
}

.race__mode--on {
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
  border-color: transparent;
}

.race__pending {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.race__hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.race__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.race__btn {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.race__btn:hover:not(:disabled) {
  border-color: var(--color-accent);
}

.race__btn--slow {
  color: var(--color-accent-text);
}

.race__btn--ghost {
  color: var(--color-text-faint);
  background: transparent;
}

.race__result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.race__result--stale {
  border-color: var(--color-danger);
}

.race__result-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.race__result-value {
  font-family: var(--font-mono);
  font-size: var(--font-size-2xl);
  font-weight: 600;
}

.race__result-value--empty {
  font-size: var(--font-size-lg);
  color: var(--color-text-faint);
}

.race__result-meta {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-text-faint);
}

.race__log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  list-style: none;
  background: var(--color-code-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.race__log-item--empty {
  font-family: var(--font-sans);
  color: var(--color-text-faint);
}
</style>
