<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

const router = useRouter()

const intervals: number[] = []
const observers: ResizeObserver[] = []
const listeners: Array<{ type: string; handler: EventListener }> = []

const timerCount = ref(0)
const observerCount = ref(0)
const listenerCount = ref(0)
const ticks = ref(0)
const moves = ref(0)
const boxWidth = ref(0)
const blocked = ref(false)
const logs = ref<string[]>([])
const box = ref<HTMLElement | null>(null)

const total = computed(() => timerCount.value + observerCount.value + listenerCount.value)

function log(message: string) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  logs.value = [`${time}  ${message}`, ...logs.value].slice(0, 6)
}

function createTimer() {
  const id = window.setInterval(() => {
    ticks.value += 1
  }, 1000)
  intervals.push(id)
  timerCount.value = intervals.length
  log(`创建 setInterval（累计 ${intervals.length} 个）`)
}

function createObserver() {
  if (!box.value) return
  const observer = new ResizeObserver((entries) => {
    boxWidth.value = Math.round(entries[0]?.contentRect.width ?? 0)
  })
  observer.observe(box.value)
  observers.push(observer)
  observerCount.value = observers.length
  log(`创建 ResizeObserver（累计 ${observers.length} 个）`)
}

function createListener() {
  const handler: EventListener = () => {
    moves.value += 1
  }
  window.addEventListener('mousemove', handler)
  listeners.push({ type: 'mousemove', handler })
  listenerCount.value = listeners.length
  log(`绑定 window mousemove（累计 ${listeners.length} 个）`)
}

function cleanupAll(reason: string) {
  for (const id of intervals) window.clearInterval(id)
  intervals.length = 0
  for (const observer of observers) observer.disconnect()
  observers.length = 0
  for (const entry of listeners) window.removeEventListener(entry.type, entry.handler)
  listeners.length = 0

  timerCount.value = 0
  observerCount.value = 0
  listenerCount.value = 0
  log(`清理完成：${reason}`)
}

onBeforeUnmount(() => {
  if (total.value > 0) cleanupAll('组件卸载时兜底')
})

onBeforeRouteLeave(() => {
  if (total.value === 0) return true
  blocked.value = true
  log(`路由离开被拦截：还有 ${total.value} 个资源没清理`)
  return false
})

async function leaveAnyway() {
  cleanupAll('手动清理后离开')
  blocked.value = false
  await router.push('/cases')
}
</script>

<template>
  <div class="leak">
    <div class="leak__stats">
      <div class="stat">
        <span class="stat__value">{{ timerCount }}</span>
        <span class="stat__label">定时器</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ observerCount }}</span>
        <span class="stat__label">观察器</span>
      </div>
      <div class="stat">
        <span class="stat__value">{{ listenerCount }}</span>
        <span class="stat__label">事件监听</span>
      </div>
      <div class="stat stat--total">
        <span class="stat__value">{{ total }}</span>
        <span class="stat__label">活动资源</span>
      </div>
    </div>

    <div class="leak__actions">
      <button type="button" class="leak__btn" @click="createTimer">创建定时器</button>
      <button type="button" class="leak__btn" @click="createObserver">创建观察器</button>
      <button type="button" class="leak__btn" @click="createListener">添加监听</button>
      <button type="button" class="leak__btn leak__btn--danger" @click="cleanupAll('手动清理')">
        全部清理
      </button>
    </div>

    <div ref="box" class="leak__box">
      <p class="leak__box-title">可拉伸的盒子</p>
      <p class="leak__box-meta">
        宽度 {{ boxWidth }}px · 拖动右下角改变尺寸 · 秒表 {{ ticks }} · 鼠标移动 {{ moves }}
      </p>
    </div>

    <p v-if="blocked" class="leak__blocked" role="alert">
      路由守卫拦住了这次离开：先清理资源，或者确认要带着泄漏离开。
      <button type="button" class="leak__btn leak__btn--danger" @click="leaveAnyway">清理并离开</button>
    </p>

    <ol class="leak__log">
      <li v-for="(line, index) in logs" :key="index" class="leak__log-item">{{ line }}</li>
      <li v-if="logs.length === 0" class="leak__log-item leak__log-item--empty">
        创建几个资源，然后点左侧「实验案例」试试离开
      </li>
    </ol>
  </div>
</template>

<style scoped>
.leak {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.leak__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: var(--space-2);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat--total {
  background: var(--color-accent-soft);
  border-color: transparent;
}

.stat__value {
  font-family: var(--font-mono);
  font-size: var(--font-size-xl);
  font-weight: 600;
  line-height: 1;
}

.stat__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.leak__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.leak__btn {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.leak__btn:hover {
  border-color: var(--color-accent);
}

.leak__btn--danger {
  color: var(--color-danger);
}

.leak__box {
  min-width: 200px;
  min-height: 84px;
  padding: var(--space-3);
  overflow: auto;
  background: var(--color-code-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  resize: both;
}

.leak__box-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.leak__box-meta {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.leak__blocked {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-warning);
  background: var(--color-warning-soft);
  border-radius: var(--radius-md);
}

.leak__log {
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

.leak__log-item--empty {
  font-family: var(--font-sans);
  color: var(--color-text-faint);
}
</style>
