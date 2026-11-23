---
description: 目录怎么分层、文件怎么命名、依赖方向与拆分决策表。
---

# 架构：目录、命名、边界与拆分

## 1. 完整目录示例

```
src/
  app/                          # 装配层：只管"把这些东西连起来"
    main.ts
    App.vue
    router/
      index.ts                  # createRouter + 汇总各 feature 的 routes
      guards.ts                 # 登录态、权限
    layouts/
      DefaultLayout.vue
      BlankLayout.vue
    providers/                  # 全局 provide、插件注册
    styles/                     # 全局样式白名单（见 §4）
      reset.css
      tokens.css
      vendor.css
      utilities.css

  shared/                       # 跨功能复用；禁止依赖 features / app
    ui/
      dialog/BaseDialog.vue
      table/BaseTable.vue
      feedback/EmptyState.vue
      feedback/SkeletonBlock.vue
      form/FormField.vue
    composables/
      useRequest.ts
      useInterval.ts
      useEventListener.ts
      useDialog.ts
    api/
      http.ts                   # fetch/axios 封装、拦截、错误归一化
      errors.ts                 # AppError / toMessage / isAbortError
    utils/
      format.ts                 # 日期、金额
    types/
      common.ts

  features/
    user/
      views/
        UserListView.vue        # 只编排
        UserDetailView.vue
      components/
        UserTable.vue
        UserFilterBar.vue
        UserEditDialog.vue      # 一个 Dialog 一个文件
        UserDeleteConfirm.vue
        UserStatusTag.vue
      composables/
        useUserList.ts
        useUserForm.ts
      api/
        user.ts                 # listUsers / getUser / updateUser
      stores/
        user.ts
      types.ts
      constants.ts
      routes.ts

    order/
      ...同构

  assets/                       # 图片、字体（不放 css）
  env.d.ts
```

## 2. 命名约定

| 类型 | 规则 | 例 |
| --- | --- | --- |
| 组件文件 | PascalCase，名字 = 组件名 | `UserEditDialog.vue` |
| Dialog | `<领域><动作>Dialog.vue` | `UserEditDialog.vue`、`OrderCancelDialog.vue` |
| 页面 | `<领域><场景>View.vue`，放 `views/` | `UserListView.vue` |
| composable | `useXxx.ts`，导出 `useXxx` | `useUserList.ts` |
| store | `useXxxStore`，文件名小写 | `stores/user.ts` |
| 接口函数 | 动词开头，按资源聚合 | `listUsers`、`updateUser` |
| 类型 | PascalCase，`XxxDTO` / `Xxx` / `XxxQuery` | `User`、`UserQuery`、`UserForm` |
| 常量 | `SCREAMING_SNAKE`，或 `xxxOptions` 数组 | `USER_STATUS_OPTIONS` |
| 其他 .ts | kebab-case 或单词小写 | `format-date.ts` |
| 事件名 | kebab-case，动词过去式/名词 | `@saved`、`@row-click` |
| props | camelCase，布尔用 `is/has/can` 前缀 | `isDisabled`、`hasMore` |

`views/` 里的文件名必须带 `View` 后缀，和可复用组件区分开。目录名一律 kebab-case（`user-center/`）。

## 3. 依赖方向

```
app  ──▶  features  ──▶  shared  ──▶  第三方库
```

| 谁 | 可以 import | 禁止 import |
| --- | --- | --- |
| `app/*` | `features/*`、`shared/*` | — |
| `features/a/*` | `shared/*`、`features/a/*` | `features/b/*`、`app/*` |
| `shared/*` | `shared/*`、第三方库 | `features/*`、`app/*` |

这三条由 `scripts/check-frontend-rules.mjs` 检查，违反直接 CI 失败。

### 跨功能要复用时怎么办

按优先级选，不要一上来就抽公共组件：

1. **纯展示/纯函数**：下沉到 `shared/ui` 或 `shared/utils`，参数化差异（props 或配置对象）。
2. **只是长得像，行为不同**：不要合并。复制一份到各自 feature，等第三次出现再抽象（Rule of Three）。
3. **一个页面要同时用两个功能**：在 `app/` 层或该页面的父级组合，让两个 feature 各自暴露组件，父级负责编排。这叫"提升到组合层"，比让 A import B 干净。
4. **需要双向联动**：走路由（URL 是唯一可信状态）或 `shared` 里的事件/查询缓存，不要互相 import store。

## 4. 全局样式白名单

`src/app/styles/` 下只允许这四个文件，其他样式一律就近写在组件里：

- `reset.css`：盒模型、margin 归零、字体继承
- `tokens.css`：设计变量，唯一颜色/间距来源
- `vendor.css`：UI 库全局变量覆盖（`.el-button { --el-color-primary: var(--color-primary) }`），只允许覆盖变量，不改结构类
- `utilities.css`：≤ 30 个工具类（`.u-flex`、`.u-hidden`、`.u-ellipsis`），超了说明在用工具类写业务样式

`main.ts` 的引入顺序固定：`reset → tokens → vendor → utilities`，保证覆盖关系可预测。

## 5. 拆分决策表

| 症状 | 拆法 | 拆完长什么样 |
| --- | --- | --- |
| 模板 > 100 行，或某个 `v-if` 分支 > 30 行 | 拆纯展示子组件 | `UserTable.vue` 只收 props、发 emits |
| script 里有 3 段互不相关的逻辑（取数/校验/埋点） | 按职责抽 composable | `useUserList.ts`、`useUserForm.ts` |
| 一堆 `if (type === 'a')` 渲染不同形态 | 配置表 + 组件映射 | `const VIEW_MAP = { a: AView, b: BView }`，`<component :is>` |
| 表单字段 > 6 个，或字段有联动 | 拆 field 组件 + schema | `UserFormFields.vue` + `userFormSchema.ts` |
| 表格操作列 > 3 个动作 | 抽 `XxxActions.vue` 或"更多"下拉 | 页面只接 `@edit` `@delete` |
| 页面里出现了第 2 个 Dialog | 各自独立文件 | `UserEditDialog.vue`、`UserDeleteConfirm.vue` |
| 样式块 > 80 行 | 抽 token 或拆视觉组件 | `UserCard.vue` + `--user-card-*` 变量 |
| 类型定义 > 40 行 | 挪到 `types.ts` | 组件只 import 类型 |
| 同一段逻辑在第 2 个组件出现 | 抽 composable | 两个组件都 `useXxx()` |
| 文件 > 1000 行 | 上面几条组合执行 | 通常能拆成 3–5 个文件 + 2 个 composable |

拆分后的验收标准：每个文件能用一句不含"并且"的话说明职责。

## 6. 页面（view）该长什么样

页面是**编排层**，不是逻辑层。它应该长这样：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import UserFilterBar from '../components/UserFilterBar.vue'
import UserTable from '../components/UserTable.vue'
import UserEditDialog from '../components/UserEditDialog.vue'
import { useUserList } from '../composables/useUserList'
import type { User, UserQuery } from '../types'

const { list, total, loading, error, query, reload } = useUserList()

const editingOpen = ref(false)
const editingUser = ref<User | null>(null)

function openEdit(user: User) {
  editingUser.value = user
  editingOpen.value = true
}

function onQueryChange(next: Partial<UserQuery>) {
  query.value = { ...query.value, ...next }
}
</script>

<template>
  <section class="user-list">
    <UserFilterBar :model-value="query" @change="onQueryChange" />
    <UserTable
      :rows="list"
      :total="total"
      :loading="loading"
      :error="error"
      @edit="openEdit"
      @refresh="reload"
    />
    <UserEditDialog v-model:open="editingOpen" :user="editingUser" @saved="reload" />
  </section>
</template>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
```

反例（同一个页面里干了所有事）：`onMounted(async () => { const res = await axios.get('/api/users'); ... })`、模板里写 200 行表格列、内联 `el-dialog` 表单、`watch` 里做权限判断和埋点。

## 7. 路由

- 路由表按 feature 拆到 `features/<x>/routes.ts`，`app/router/index.ts` 只做汇总。
- 除首页外全部懒加载：`component: () => import('../views/UserListView.vue')`。
- `meta` 集中声明：`{ title, requiresAuth, permission }`，权限判断只在 `guards.ts` 里写一次。
- 参数以 URL 为准：筛选条件、分页、tab 都进 query，便于分享和刷新还原。
- 路由名用 kebab-case 且全局唯一：`user-list`、`user-detail`。

## 8. 关于 barrel 文件（`index.ts` 重导出）

不建议在 `features/` 和 `shared/` 里建 `index.ts` 统一导出：会造成循环依赖、拖慢 tree-shaking、IDE"跳转到定义"变成跳到 barrel。直接按真实路径 import，路径长一点但可读、可检查。脚本默认把 `features/*/index.ts` 报为错误（可用 `--allow-barrels` 关闭）。
