---
description: 接口层、composable、Pinia 边界、请求竞态与三态处理。
---

# 数据、状态与异步

## 1. 分层：页面不碰请求，请求不碰 UI

```
view           只编排：调 composable、绑 props、接事件
composable     业务状态与流程：loading / error / 分页 / 重试 / 取消
api            只做 HTTP：拼 URL、传参、返回类型化数据，不含业务判断
store          跨组件共享的领域状态（登录态、字典、购物车）
```

规则：

- `api/*.ts` 里不出现 `ElMessage`、`router.push`、`ref`。它只返回数据或抛错误。
- `composables/*.ts` 里不出现 DOM 操作与模板细节。
- `views/*` 与 `components/*` 里不出现 `fetch` / `axios` / URL 字符串。
- 一处 `try/catch` 只归一化一次错误，别在每层都包一遍。

## 2. 接口层

### 2.1 统一的 http 封装

```ts
// shared/api/http.ts
export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
}

export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...init } = options
  const url = new URL(path, import.meta.env.VITE_API_BASE)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new AppError('请求失败', `http_${response.status}`, response.status, detail)
  }
  // 204 无 body
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
```

要点：

- 基地址走 `import.meta.env`，不硬编码；`env.d.ts` 里声明变量类型。
- 错误统一成 `AppError`，UI 只认这一种，文案映射集中在一处。
- 不要把 token 拼在 URL 上；鉴权放 header 或 cookie。
- 业务码（`code !== 0`）也在这一层转成 `AppError`，别让页面判断 `res.code`。

### 2.2 一个资源一个文件

```ts
// features/user/api/user.ts
import { request } from '@/shared/api/http'
import type { PageResult, User, UserForm, UserQuery } from '../types'

export function listUsers(query: UserQuery, signal?: AbortSignal) {
  return request<PageResult<User>>('/users', { params: { ...query }, signal })
}

export function getUser(id: string, signal?: AbortSignal) {
  return request<User>(`/users/${id}`, { signal })
}

export function updateUser(id: string, form: UserForm) {
  return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(form) })
}
```

- 每个函数都显式标注返回类型（便于 mock 与重构）。
- 可取消的查询接口接受 `signal`。
- 不在 api 层做数据转换（把 DTO 拍平成 UI 结构），转换放 composable 或 `mappers.ts`，便于测试。

## 3. Composable

命名 `useXxx`，返回**只读状态 + 操作方法**：

```ts
// features/user/composables/useUserList.ts
import { onScopeDispose, ref } from 'vue'
import { isAbortError, toMessage } from '@/shared/api/errors'
import { listUsers } from '../api/user'
import type { User, UserQuery } from '../types'

export function useUserList(initial: UserQuery) {
  const list = ref<User[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const query = ref<UserQuery>({ ...initial })

  let controller: AbortController | null = null

  async function load() {
    controller?.abort()               // 旧请求作废，避免后到的旧响应覆盖新数据
    const current = new AbortController()
    controller = current

    loading.value = true
    error.value = null
    try {
      const page = await listUsers(query.value, current.signal)
      if (current.signal.aborted) return
      list.value = page.items
      total.value = page.total
    } catch (e) {
      if (isAbortError(e)) return
      error.value = toMessage(e)
    } finally {
      if (controller === current) loading.value = false
    }
  }

  onScopeDispose(() => controller?.abort())  // 组件卸载即取消，防泄漏 + 防无效 setState

  return { list, total, loading, error, query, load }
}
```

要点：

- 用 `onScopeDispose`（而不是 `onBeforeUnmount`），这样在组件外被 effectScope 使用时也成立。
- 竞态三件套：`abort()` 旧请求、判断 `signal.aborted`、`controller === current` 再改 loading。
- 状态用 `ref` 暴露，不要暴露 `reactive` 对象让外部随意改内部字段。
- 需要"只读"语义时返回 `readonly(list)` 或 `computed`，明确外部不可写。

## 4. Pinia：只放领域状态，不放页面状态

```ts
// features/user/stores/user.ts
import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { getUser } from '../api/user'
import type { User } from '../types'

export const useCurrentUserStore = defineStore('user/current', () => {
  const profile = shallowRef<User | null>(null)   // 大对象不必深代理
  const loading = ref(false)
  const isAdmin = computed(() => profile.value?.role === 'admin')

  async function fetchProfile(force = false) {
    if (profile.value && !force) return profile.value
    loading.value = true
    try {
      profile.value = await getUser('me')
      return profile.value
    } finally {
      loading.value = false
    }
  }

  function reset() {
    profile.value = null
    loading.value = false
  }

  return { profile, loading, isAdmin, fetchProfile, reset }
})
```

规则：

- store id 带命名空间：`user/current`、`order/list`。
- **不把"弹窗开没开、tab 选中哪个、表格 loading"放进 store**——那是页面状态，跟着页面走。
- store 不持有组件实例、DOM、定时器；需要异步初始化就提供 `ensureLoaded()`，由页面在 `onMounted` 调。
- 必须提供 `reset()`：登出、切换租户时统一清理，比逐个字段赋值可靠。
- 持久化要显式（`pinia-plugin-persistedstate` 的 `pick` 白名单），不要整库落盘。
- 组件里不 `storeToRefs` 拆一堆再传三层，直接用 `store.xxx`，或在 composable 里封装。

## 5. 三态与错误

每个数据区域必须显式处理四种状态，缺一即 bug：

| 状态 | 表现 |
| --- | --- |
| loading | 骨架屏或 spinner，首次加载与刷新区分（刷新不要整页白） |
| error | 错误提示 + 重试按钮，保留已有数据时用 toast 而非清空 |
| empty | 空态插画 + 主操作引导（"还没有用户，新建"） |
| success | 正常渲染 |

错误文案：

- `AppError` → 用户能懂的文案（"保存失败，请重试"），技术细节进 `console.error` 或上报。
- 网络错误与业务错误分开文案。
- 全局兜底：`app.config.errorHandler` 上报 + `onErrorCaptured` 局部降级；路由级 `errorComponent`。

## 6. 类型契约

- API 返回类型与表单类型分开：`UserDTO`（后端原样）→ `User`（前端领域）→ `UserForm`（提交）。混用一个类型是最常见的隐性 bug 源。
- `unknown` 收窄，禁止 `as any`；外部数据（URL、localStorage、postMessage）进来先校验。
- `tsconfig` 打开 `strict`、`noUncheckedIndexedAccess`、`noUnusedLocals`、`verbatimModuleSyntax`。
- `import type` 只导类型，避免运行时引入。
- 常量联合优于 `enum`：`type UserRole = 'admin' | 'member'`。
- `satisfies` 保证字面量既保留窄类型又被校验：`const COLUMNS = [...] satisfies Column<User>[]`。

## 7. 其他容易漏的点

- 日期/金额统一走 `shared/utils/format.ts`，不要在模板里 `toLocaleString` 各写一遍。
- 时区：后端传 ISO 字符串，前端只做展示转换；不要在传输层用本地时间字符串。
- 分页约定（页码从 1 还是 0、pageSize 范围）写进 `types.ts` 注释，别靠记忆。
- 轮询/长连接统一封装（`usePolling`），页面卸载必须停。
- 埋点集中在一个 composable 或指令里，禁止散落在业务分支中。
