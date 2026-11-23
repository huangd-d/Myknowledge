---
description: 组件臃肿指标、11 类内存泄漏的逐条代码与审查流程。
---

# 组件臃肿审查 + 内存泄漏审查

## 一、组件臃肿：先量化，再判断

### 1.1 指标表

| 指标 | 正常 | 需要关注 | 必须拆分 |
| --- | --- | --- | --- |
| 文件行数 | < 250 | 250–400 | **> 400（硬红线 1000）** |
| props | ≤ 5 | 6–7 | > 7 |
| emits | ≤ 3 | 4–5 | > 5 |
| `ref` / `reactive` 数量 | ≤ 5 | 6–8 | > 8 |
| `watch` / `watchEffect` | ≤ 2 | 3–4 | > 4 |
| 模板嵌套深度 | ≤ 3 | 4 | > 4 |
| 单文件 import | ≤ 8 | 9–12 | > 12 |
| 模板内 `v-if/v-else-if` 链 | ≤ 2 | 3 | > 3 |
| 组件的"职责" | 1 个 | 1.5 个 | ≥ 2 个 |

**一句话判据**：能否用不含"并且"的一句话说明这个组件负责什么？不能，就是两个组件。

### 1.2 五个典型臃肿形态

1. **页面即应用**：一个 `List.vue` 里塞了筛选、表格、分页、三个弹窗、导出、权限、埋点。→ 按 R1/R2 拆：`FilterBar` + `Table` + 三个 Dialog + `useList`。
2. **配置爆炸**：组件有 20 个 props（`showHeader`、`headerTitle`、`headerRightText`、`headerRightClick`…）。→ 用 slot 替代样式类 prop，用对象 prop 替代成组 prop。
3. **条件地狱**：`v-if="type==='a'"` 三套形态挤在一个模板。→ 组件映射表 `<component :is="VIEW_MAP[type]">`。
4. **万能表格列**：一个 `Columns.vue` 用 `v-if` 支持 12 种业务列。→ 每类列一个渲染组件，列定义里给 `component` 字段。
5. **万能弹窗**：`FormDialog.vue` 靠 `mode: 'create' | 'edit' | 'copy'` 分叉 200 行。→ 三种场景三个 Dialog，共享 `UserFormFields.vue` 与 `useUserForm.ts`。

### 1.3 拆分手法速查

| 想拆的东西 | 手法 | 注意 |
| --- | --- | --- |
| 模板片段 | 子组件（props 进、emits 出） | 不要拆成"只为少 30 行"的碎片，要能独立命名 |
| 逻辑分支 | composable / 策略对象 | 保持纯逻辑，便于单测 |
| 样式 | token + 独立视觉组件 | 别把样式拆到全局 css |
| 类型 | `types.ts` | 组件只 `import type` |
| 常量/选项 | `constants.ts` | 选项数组配 `as const satisfies` |
| 复用交互 | composable | 状态与清理写在里面 |

### 1.4 拆分后自检

- props 是否变少了？如果拆完 props 更多，说明拆错了边界。
- 子组件是否能脱离父组件单独渲染（给 mock props 就能跑）？
- 事件是否都在往上传，而不是子组件偷偷调父级逻辑？
- 是否引入了 3 层以上的 props 透传？是的话改 `provide/inject` 或 composable。

## 二、内存泄漏：按副作用类型逐条排查

Vue 组件卸载时不会自动清理"你手动创建的东西"。以下每一条都必须能在代码里指出对应的清理语句。

### 2.1 事件监听

```ts
// ❌ 泄漏：每次挂载加一个，卸载不删
onMounted(() => window.addEventListener('resize', onResize))

// ✅ 封装后自动成对
// shared/composables/useEventListener.ts
import { onScopeDispose } from 'vue'
export function useEventListener(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
) {
  target.addEventListener(type, handler, options)
  onScopeDispose(() => target.removeEventListener(type, handler, options))
}
```

注意：`window` 级监听的 handler 如果闭包持有大对象（图表实例、长列表），不清理会连数据一起泄漏。

### 2.2 定时器

```ts
// ✅ 成对出现，且封装保证
export function useInterval(callback: () => void, ms: number) {
  const id = window.setInterval(callback, ms)
  onScopeDispose(() => window.clearInterval(id))
  return { stop: () => window.clearInterval(id) }
}
```

反例：`setInterval` 里读 `props`，组件卸载后仍每秒执行并持有旧 props。`setTimeout` 若是一次性提示可以不留，但**递归 setTimeout 轮询必须停**。

### 2.3 Observer 三件套

```ts
const el = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!el.value) return
  observer = new ResizeObserver(([entry]) => {
    if (entry) emit('resize', entry.contentRect)
  })
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
```

`IntersectionObserver`（无限滚动、曝光埋点）和 `MutationObserver`（第三方 DOM）同理。`observe()` 多个目标时 `disconnect()` 一次清空。

### 2.4 requestAnimationFrame

```ts
let rafId = 0
function tick() {
  // ...
  rafId = requestAnimationFrame(tick)
}
onMounted(() => { rafId = requestAnimationFrame(tick) })
onBeforeUnmount(() => cancelAnimationFrame(rafId))
```

递归 rAF 循环最容易"卸载后还在跑"，因为它不依赖组件状态也能继续。

### 2.5 第三方实例（最高频的真泄漏）

```ts
import * as echarts from 'echarts'

const container = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!container.value) return
  chart = echarts.init(container.value)
  chart.setOption(buildOption(props.data))

  resizeObserver = new ResizeObserver(() => chart?.resize())
  resizeObserver.observe(container.value)
})

watch(() => props.data, (data) => {
  chart?.setOption(buildOption(data), { notMerge: true })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()          // 关键：dispose 才能释放 canvas 与内部事件
  chart = null
})
```

同类：地图（`map.destroy()`）、富文本编辑器、Monaco（`editor.dispose()`）、视频/音频（`pause()` + 清 `src`）、WebGL 上下文（`loseContext()`）。

### 2.6 WebSocket / SSE / Worker

```ts
let socket: WebSocket | null = null

onMounted(() => {
  socket = new WebSocket(url)
  socket.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
  socket?.removeEventListener('message', onMessage)
  socket?.close(1000, 'unmount')
  socket = null
})
```

`Worker` 要 `terminate()`；`EventSource` 要 `close()`；`BroadcastChannel` 要 `close()`。

### 2.7 请求竞态与卸载后 setState

```ts
// ❌ 用户快速切 tab：慢的旧响应后到，覆盖新数据；卸载后还写 ref
async function load(id: string) {
  data.value = await fetchDetail(id)
}

// ✅ abort + 判断
async function load(id: string) {
  controller?.abort()
  const current = new AbortController()
  controller = current
  try {
    const result = await fetchDetail(id, current.signal)
    if (current.signal.aborted) return
    data.value = result
  } catch (e) {
    if (isAbortError(e)) return
    throw e
  }
}
onScopeDispose(() => controller?.abort())
```

### 2.8 全局总线 / 跨组件订阅

```ts
// ❌ mitt 订阅不解除，组件销毁后回调仍被调用
bus.on('order:updated', onUpdated)

// ✅ 卸载时 off
const off = bus.on('order:updated', onUpdated)
onScopeDispose(off)
```

同一类问题：`store.$subscribe`、`watch` 返回的 stop（在 `setup` 内创建的会自动停，但在 `setTimeout` / 事件回调里创建的不会）、`window.matchMedia(...).addEventListener`。

### 2.9 keep-alive

被 `<keep-alive>` 缓存的页面**不会卸载**，定时器和轮询会一直跑：

```ts
onActivated(() => startPolling())
onDeactivated(() => stopPolling())
```

### 2.10 大对象与响应式开销

- 只读的大树/大列表：`shallowRef` + 整体替换，或 `markRaw` 掉不需要响应式的类实例。
- 不要 `reactive` 包 ECharts 实例、地图实例、第三方类实例（会深代理内部结构，既慢又可能报错）。
- 长列表渲染用虚拟滚动（`vue-virtual-scroller` 或 UI 库的 virtual table），不要一次渲染 5000 行。
- 组件销毁后仍被闭包引用的数据（例如未取消的 debounce）也是泄漏，`useDebounceFn` 卸载时 `cancel()`。

### 2.11 Pinia / provide-inject

- store 里不放组件实例、DOM、定时器 id 之外的资源句柄。
- `provide` 的响应式对象若被 `inject` 方长期持有，注意 `onScopeDispose` 时清引用（尤其页面级 provider）。
- `app.provide` 的全局依赖必须在应用卸载时清理（微前端场景高频）。

## 三、审查流程（可直接照着做）

1. **跑脚本**：`node scripts/check-frontend-rules.mjs src`，先看行数/命名/跨功能引用/未配对副作用。
2. **搜副作用**：

   ```bash
   grep -rn "addEventListener\|setInterval\|setTimeout\|requestAnimationFrame\|new .*Observer\|new WebSocket\|new Worker" src --include=*.vue --include=*.ts
   ```

   每个命中点，往上找它所在的 `useXxx` 或 `onMounted`，问："谁清理？在哪一行？"
3. **搜 watch**：`watch(` 是否 `deep: true` 且回调里有请求/定时器/大计算？
4. **搜第三方 init**：`init(` 是否都有对应 `dispose/destroy/close`？
5. **数指标**：行数、props、emits、ref、watch、嵌套深度，对照 §1.1 表。
6. **读模板**：是否能一眼看出"这是列表页"，还是"这是整个后台"？
7. **读一个方法**：随机挑一个 `async` 方法，看它是否同时做取数、转换、提示、跳转、埋点——是则拆。
8. **确认卸载路径**：在脑中模拟"用户直接切走页面"，哪些东西还会继续跑？

## 四、Review 结论模板

```
【体积】412 行 / 9 props / 5 watch → 超过红线，需拆分
【职责】同时负责筛选状态、表格渲染、导出、埋点 → 拆为 UserFilterBar / UserTable / useUserExport
【泄漏】L88 setInterval 无 clearInterval；L140 ECharts 无 dispose；L201 mitt.on 无 off
【竞态】L60 load() 未 abort，快速切 tab 会旧数据覆盖新数据
【样式】L320 硬编码 #2563eb、L341 z-index: 9999 → 改 token
【结论】拆分 + 补清理后再合并；上一版已存在的同类问题另开 issue，不阻塞本次
```
