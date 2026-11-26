---
description: 目录怎么分层、文件怎么命名、依赖方向与拆分决策表。
---

# 架构：目录、命名、边界与拆分

## 1. 完整目录示例

```
src/
  content/                      # 内容层：md / json / 图片，只有数据没有代码（见 §9）
    <collection>/
      _meta.json                # 合集标题/摘要/排序
      <order>-<slug>.md         # 一篇文档一个文件

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

## 9. 三类资产：agent / 代码 / 内容

一个仓库里通常同时躺着三种"看起来都是文件"的东西。边界一糊，最先坏的是可发布性。

| 资产 | 位置 | 谁消费 | 进构建 |
| --- | --- | --- | --- |
| agent 资产 | `skills/`、`.claude/`、`.cursor/`、`AGENTS.md`、`prompts/` | 大模型、编辑器 | 否 |
| 项目代码 | `src/**`（`content` 之外） | 浏览器 | 是 |
| 项目内容 | `src/content/`、`src/assets/`、`public/` | 站点运行时 | 是 |
| 构建脚本 | `scripts/`、`*.config.ts` | Node | 只在构建期 |

判定口诀：**"删掉它，线上会不会变？"** 会 → 属于项目；不会 → 属于工具链。

### 反模式：让页面去 glob 根目录的 skills

```ts
// ❌ skills/ 是 agent 资产，却被页面当成了内容
const modules = import.meta.glob('../../../../skills/**/*.md', { query: '?raw', eager: true })
```

三个后果：

1. `skills/` 被卷进构建，改一条规范就等于改线上页面；
2. 清理或重命名 skills 会直接让构建失败，agent 资产的独立性没了；
3. 内容作者和规范作者被绑在同一份文件上，谁都不敢动。

### 正确形态

```ts
// ✅ 内容只来自 src/content，路径不出 src
const DOCS = import.meta.glob('../../../content/**/*.md', { query: '?raw', eager: true })
```

```
src/content/threejs/_meta.json         合集元信息：title / summary / order
src/content/threejs/01-render-loop.md  一篇文档一个文件，数字前缀即顺序
```

### 迁移配方（把根目录内容搬进 src）

1. `git mv skills/<合集> src/content/<合集>`，保留历史；
2. 补 `_meta.json`，把原来写在代码里的分类标题/排序挪进来；
3. 数据层 glob 前缀改成 `../../../content/`，删掉旧的根目录分支；
4. 路由从 `/kb/:id` 升级成 `/kb/:collection/:slug`（有了合集就该有合集页）；
5. 跑 `check:rules`，确认没有 `import-outside-src` / `glob-outside-src`。

### 什么时候允许同一份文本两处出现

几乎不允许。确实需要（既要给 agent 读、又要上站）时：**内容放 `src/content/`，用 npm script 或 vite 插件单向生成到 `skills/`**，并在 README 写明哪边是源。反向生成（skills → content）迟早分叉。

### 新增顶层目录的门槛

只有出现**新的圈层**才加顶层目录。以下都不是理由：文件变多了、想按类型分组、看起来更整齐。顶层目录越少越好，`src/` 里面才是组织的主战场。

## 10. 新建目录前的三问

目录是最便宜也最难改的架构决策：加一层只要一分钟，拆掉它要改几十个 import。所以建之前先过一遍。

### 10.1 三问、怎么验证、什么信号算失败

| 问题 | 怎么验证（1 分钟内能做） | 不过关的信号 |
| --- | --- | --- |
| **低耦合** | 数一下：谁 import 它？它 import 谁？删掉它要改几处？ | 它 import 了 3 个以上兄弟目录；被 5 个不相干的地方引用；删它要改到 feature 之外 |
| **高内聚** | 用一句不含"并且"的话命名它；列出"会一起改"的文件 | 目录里同时有取数、渲染、通用工具三类东西；改 A 常连带改 B；`index.ts` 什么都往外抛 |
| **可读** | 让没参与的人只看目录树，说"新加一个 X 该放哪" | 路径要念 4 层；名字是 `utils`/`common`/`misc`；同级命名风格不统一（`user/`、`userComponents/`、`UserUtils/`） |

三条都过才建。有一条含糊，就先放进最近的现有目录，用文件名区分，等**第二次**出现再抽。

### 10.2 判定树

```
要加的东西
├─ 是一个新功能域吗？（有自己的路由 / 数据 / 权限）
│    └─ src/features/<名词>/
├─ 只是某个功能内部的一部分吗？
│    └─ 该 feature 下的子目录，名字用名词：form/ table/ filters/ chart/
├─ 会被 ≥2 个功能复用吗？
│    └─ src/shared/<类型>/<域>/   例如 shared/ui/table/、shared/api/、shared/utils/format.ts
├─ 只是一次性脚本或工具？
│    └─ scripts/
└─ 都不确定
     └─ 先不建目录，放进最近的功能目录，靠文件名区分
```

### 10.3 一个目录成立的四个条件

1. **有独立的变更原因**：改它的时候不需要同时改别处；
2. **有名字**：名词，能塞进一句话，不是"杂项"；
3. **有 owner**：出问题知道找谁，而不是"大家都往里加一点"；
4. **能被删掉**：删了只影响它自己（依赖单向、无循环）。

缺一条，它就不是"目录"，只是"文件夹"。

### 10.4 反模式

| 反模式 | 为什么坏 | 改法 |
| --- | --- | --- |
| `utils/`、`common/`、`helpers/`、`misc/` 当万能桶 | 没有边界，谁都能往里扔，半年后 60 个文件互不相识 | 按领域拆：`format/`、`storage/`、`request/`、`dom/`；**超过 3 个文件脚本会 warn** |
| 顶层按技术类型分（`src/views/`、`src/components/`、`src/stores/`） | 找"订单"要跳 4 个目录，改一个需求动 4 处 | 功能垂直切片（R1） |
| 一个功能只有 3 个文件也建 5 层目录 | 目录比文件多，跳转成本大于收益 | 少于 5 个文件不建子目录 |
| 目录名用动词（`create/`、`edit/`） | 描述动作不描述内容，功能一变就名不副实 | 用名词：`order-form/`、`user-editor/` |
| 按后端接口/表结构分目录 | 前端的变化节奏和后端不一样，改版时全错位 | 按前端的使用场景分 |
| 目录里再放 `index.ts` 重导出 | 循环依赖 + 跳转变成跳 barrel | 直接按真实路径 import（§8） |

### 10.5 深度与数量

- `src` 下目录深度 **≤ 3 层**（`features/user/components`）；第 4 层要能说出为什么不能拍平。
- 单个目录直接文件 **≤ 10 个**；15 个以上说明这一层混了两种职责（脚本会在 15 报 warn、25 报 error）。
- 同一层目录 **≤ 12 个**；超过说明上一层该再抽象，或者这一层确实混了两个圈层。

### 10.6 删除测试

建之前先写一句话：

> "如果明天删掉这个目录，我需要改 __ 处。"

- 答案 **> 3**：耦合过高，先把依赖理顺再建；
- 答案 **= 0**：现在没人用它，说明还不该存在；
- 答案 **= 1**：这才是健康的目录——只影响它自己。

### 10.7 给 review 的一句话

看到 PR 里新增目录，先问这三个问题，再问"为什么不放在现有目录里"。第二个问题往往比第一个更能暴露设计问题。
