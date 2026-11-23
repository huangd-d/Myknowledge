---
name: vue3-ts-vite-frontend
description: Vue 3 + TypeScript + Vite 前端工程规范与代码审查。用于新建功能、拆分文件、编写组件/Dialog/样式、审查组件臃肿与内存泄漏、配置 oxlint + oxfmt + vue-tsc + Vitest 门禁。关键词：vue3、vite、ts、SFC、composable、pinia、拆分、千行文件、内存泄漏、组件审查、oxlint。
---

# Vue 3 + TS + Vite 前端工程规范

## 何时用

- 新建页面、功能模块、组件、composable、接口层
- 拆分超长文件、拆分 Dialog / Drawer / 表单等小功能
- 写样式、抽取主题变量、覆盖 UI 库样式
- Code Review：判断组件是否臃肿、是否有内存泄漏
- 配置 lint / format / 类型检查 / CI 门禁
- 整理仓库根目录：分不清哪些文件该进构建、哪些只是给 agent 看的

## 核心思想（后面所有规则都是它的推论）

**文件是职责单位，不是代码量的容器。**

- 一个文件只有一个"变更原因"：改需求时只应该改一个文件，改一个文件时只应该因为一个原因。
- **目录回答"属于哪个功能"，文件名回答"这是什么"。** 看路径就能知道该不该在这里。
- **副作用必须与清理成对出现，并且写在一起。** 一个 `setInterval` 距离它对应的 `clearInterval` 超过 20 行，迟早会漏。
- **agent 资产、项目代码、项目内容是三份不同的东西。** 混在一起时最先坏掉的是可发布性：你会开始依赖一个本来不该进构建的目录。
- **规范必须能被机器检查，否则三个月后一定腐化。** 因此所有硬阈值都落成 `scripts/check-frontend-rules.mjs`。

## 六条硬规则

### R1 功能垂直切片：一个功能一个目录，跨功能只走 `shared/`

```
src/features/<feature>/
  views/           页面（只做编排）
  components/      该功能私有组件（含 Dialog）
  composables/     该功能的组合式函数
  api/             该功能的接口
  stores/          该功能的 Pinia store
  types.ts         该功能的类型
  constants.ts     该功能的常量
  routes.ts        该功能的路由
```

- 禁止把两个不相干功能塞进同一目录（`src/views/system/` 下同时躺用户、角色、菜单、日志 = 违规）。
- 禁止功能之间互相 `import`。要复用得先下沉到 `shared/`，或由 `app/` 层页面组合两个功能。
- `src/components/` 不做通用垃圾场。真正通用的组件进 `shared/ui/<domain>/`（如 `shared/ui/dialog/`、`shared/ui/table/`）。
- 依赖方向单向：`app → features → shared`，反向 import 由脚本报错。

### R2 小功能独立文件：Dialog 永远是自己的文件

一个 Dialog = 一个 `XxxDialog.vue`。主页面里只留三样东西：`v-model:open`、`@saved="reload"`、一个 `ref`。

必须独立成文件的：Dialog、Drawer、Popover 内容、确认框、表单区块（> 6 个字段）、表格操作列、空态、骨架屏、加载遮罩、复杂 Tooltip 内容、列表面板头部工具条。

禁止：
- 在页面里直接写 `el-dialog` / `a-modal` 的一整块业务表单；
- 一个文件里 `export` 多个组件（含同文件定义两个 `defineComponent`）；
- 用 `v-if` 在同一文件里堆三套"弹窗 + 表单"变体。

### R3 样式就近：组件样式写在组件的 `<style scoped>` 里

- 全局 CSS 只允许四类，全部放 `src/app/styles/`：`reset.css`、`tokens.css`（CSS 变量）、`vendor.css`（UI 库覆盖）、`utilities.css`（少量工具类）。
- 组件私有 class 用组件名前缀：`.user-card__header`，不写裸标签选择器、不写全局类名。
- 颜色/间距/圆角/z-index/字号一律用 `var(--token)`，禁止硬编码 `#2563eb`、`13px`、`z-index: 9999`。
- `:deep()` 只允许用于覆盖第三方组件，且必须写注释说明覆盖哪个类；禁止用它穿透自己的业务组件。
- 不要在 `.vue` 里 `@import` 另一个组件的样式。

### R4 体积红线：> 1000 行必须拆，> 400 行开始考虑拆

| 对象 | 建议 | 警告 | 必须处理 |
| --- | --- | --- | --- |
| 任意文件 | — | 400 行 | **1000 行** |
| 页面 `views/*View.vue` | ≤ 200 | 250 | 400 |
| 组件 SFC | ≤ 250 | 300 | 400 |
| composable | ≤ 150 | 200 | 300 |
| store | ≤ 150 | 200 | 300 |
| props 数量 | ≤ 5 | 7 | 10 |
| emits 数量 | ≤ 3 | 5 | 7 |
| 模板嵌套深度 | 3 | 4 | 5 |
| 单文件 import | 8 | 12 | 15 |
| 一个目录直接文件数 | 10 | 15 | 25 |

拆分不是"把行数切两半"，而是按职责拆。决策表见 `references/architecture.md`。

### R5 审查两件事：组件臃肿 + 内存泄漏

**臃肿信号**（命中 ≥ 2 条就该拆）：行数超阈值、props ≥ 7、`ref`/`reactive` ≥ 8 个、`watch` ≥ 4 个、模板里 `v-if/v-else-if` 链 ≥ 3 层、单组件 import ≥ 12、组件同时负责"取数 + 转换 + 渲染 + 交互 + 埋点"。

**泄漏信号**（每一条都必须找到对应的清理代码）：

| 副作用 | 错误写法 | 正确做法 |
| --- | --- | --- |
| 事件监听 | `onMounted(() => window.addEventListener(...))` 无解绑 | `useEventListener()` 或 `onBeforeUnmount` 成对解绑 |
| 定时器 | `setInterval` 只在 `onMounted` 里设 | `useInterval()`，内部 `onScopeDispose` 清理 |
| Observer | `new ResizeObserver` 后 `unobserve` 都没写 | 存句柄，卸载 `disconnect()` |
| rAF | 递归 `requestAnimationFrame` 无 `cancel` | 存 rafId，卸载 `cancelAnimationFrame` |
| WebSocket/SSE/Worker | 页面切走不断开 | `close()` / `terminate()` |
| 第三方实例 | ECharts/地图/富文本/Monaco 只 `init` 不 `dispose` | 卸载 `dispose()`，重建前先销毁 |
| 请求竞态 | 参数变化后旧响应覆盖新响应 | `AbortController` + 卸载时 `abort()` |
| 全局总线 | `mitt.on` 不解绑 | `on` 的返回值在卸载时 `off` |
| keep-alive | 缓存页面里的轮询一直跑 | `onDeactivated` 停、`onActivated` 启 |
| 大对象响应式 | `reactive(bigTree)` 深代理 | `shallowRef` + `markRaw` |

审查方法：全局搜 `addEventListener|setInterval|setTimeout|new .*Observer|new WebSocket|watch\(|onMounted`，逐个回答"谁在什么时候清理它"。没有答案就是泄漏。

### R6 三类资产分家：agent 资产 / 项目代码 / 项目内容

**判定标准**：这个文件会被构建吗？会被产品用户看到吗？两个答案都是"不会"，它属于 agent 工具链，不属于项目。

| 圈层 | 典型位置 | 谁读它 | 能被 app 代码引用 |
| --- | --- | --- | --- |
| agent 资产 | `skills/`、`.claude/`、`.cursor/`、`AGENTS.md`、`CLAUDE.md`、`prompts/` | 大模型、编辑器 | **绝不** |
| 项目代码 | `src/**` | 浏览器 | 可以 |
| 项目内容 | `src/content/`、`src/assets/`、`public/` | 站点运行时 | 由 feature 读取 |
| 构建脚本 | `scripts/`、`*.config.ts` | Node | 只给构建期 |

- **app 代码只能读 `src/` 内的文件。** 任何 `import` 或 `import.meta.glob('../../../skills/**/*.md')` 越出 `src/` 都是边界破损，规则脚本直接报错。这不是洁癖：越界引用会让构建产物取决于一个"随时可能被清理"的目录。
- **内容进 `src/content/<合集>/`**：一个合集一个目录 + `_meta.json`，feature 通过 glob 读。不要放在仓库根目录让代码跨层去捞。
- **改 agent 资产不应该影响线上，改内容不应该影响 agent 行为。** 耦合的典型症状：改 `skills/` 里一条规范，线上页面跟着变；删掉 skills 目录，构建挂了。
- 同一份文本既要给 agent 读又要上站 → **单一来源 + 构建期复制**（npm script 或 vite 插件生成到 `src/content/`），禁止双向引用。
- 仓库根目录只放：源码、配置、脚本、`README`/`CHANGELOG`。**不放"内容库"。**

为什么这条比前面五条更容易破：agent 资产大多也是 Markdown，而 Markdown 恰好也是内容，目录上看起来"都是文档"，一不留神就被 glob 进去。判断依据不是文件类型，而是**它会不会被发布**。

## 工具链事实（先纠正一个常见误解）

`oxlint` 是 **linter**，不负责格式化；格式化要用 **`oxfmt`**（Prettier 的替代者）。两者边界：

- oxlint 对 `.vue` 的覆盖以 `<script>` 为主，**模板层规则不完整**；模板规范仍需 `eslint-plugin-vue` 兜底（或接受只靠 review）。
- oxfmt 能格式化 `.vue` 内的 `<script>` 与 `<style>`，但**默认不重排 `<template>` 结构**，模板的换行/缩进要人工保持或单独用 Prettier。
- Vite 构建**不做类型检查**，`vue-tsc --noEmit` 必须单独跑，否则"能构建"会骗人。

所以一条命令不够，校验链是：`oxfmt --check` → `oxlint` → `vue-tsc --noEmit` → 自定义规则脚本 → `vitest run` → `vite build`。

## 工作流

### 写新功能

1. 在 `src/features/<feature>/` 下开目录，先写 `types.ts`（数据长什么样），再写 `api/`（怎么拿），再写 `composables/`（怎么算），最后写 `views/`（怎么放）。
2. 页面只做编排：调 composable 拿状态 → 传给子组件 → 处理事件。页面里出现 `await fetch` 就是错位。
3. 任何弹窗/表单区块在动手前就建成独立文件，不要"先写页面回头再拆"（回头通常不会来）。
4. 写完跑 `pnpm verify`。

### 审查一个组件

1. 跑 `node scripts/check-frontend-rules.mjs src` 看硬指标。
2. 对照 R5 的臃肿信号，回答：能不能用一句话说清它负责什么？说不清就是两个组件。
3. 对照泄漏表逐个副作用找清理代码。
4. 检查拆分后的接口面：props/emits 是否还在膨胀，是否该改成 slot 或 provide/inject。
5. 检查是否有"顺手加的第二件事"（埋点、格式化、权限判断、路由跳转）。

### 新增内容或工具目录

1. 先问"它会被发布吗"：会 → `src/content/`；不会 → `skills/`、`docs/` 或仓库外的个人目录。
2. 内容合集配一个 `_meta.json`（标题/摘要/排序），不要把合集元信息写成代码常量。
3. 跑 `check:rules`，确认没有 `import-outside-src` / `glob-outside-src` 报错。

## 提交前

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:rules && pnpm test -- --run
```

新代码严格执行本规范；存量代码"触碰即改"——改到哪个文件，那个文件就要符合规范，不做全量重构。

## 参考文件

| 文件 | 内容 |
| --- | --- |
| `references/architecture.md` | 目录与命名、依赖方向、拆分决策表、跨功能通信、路由 |
| `references/components.md` | SFC 结构、props/emits/model、Dialog 模板代码、样式与 token、无障碍 |
| `references/data-and-state.md` | 接口层、composable、Pinia、请求竞态、三态、类型契约 |
| `references/memory-and-performance.md` | 泄漏清单逐条代码、性能清单、审查流程与结论模板 |
| `references/quality-gates.md` | oxlint/oxfmt/tsc/vitest 配置、CI、lint-staged、例外机制、落地路线 |
| `scripts/check-frontend-rules.mjs` | 零依赖检查脚本：行数、命名、目录边界、跨功能引用、跨 `src` 越界引用、scoped 样式、泄漏启发式 |

## 安装与使用

本目录本身就是一个技能包，`SKILL.md` 是入口。放到你的 agent 技能目录下（例如用户级 `~/.dsh/skills/`、`~/.claude/skills/`，或项目级 `.dsh/skills/`、`.claude/skills/`），重启会话后即可按名字加载；也可以直接把 `references/` 当团队规范文档阅读。

把脚本复制进项目：

```bash
mkdir -p scripts
cp <skill-dir>/scripts/check-frontend-rules.mjs scripts/
node scripts/check-frontend-rules.mjs src
```

要求 Node 18+，无任何依赖。`--json` 供 CI 聚合，`--allow-barrels` 关闭 barrel 检查。脚本里所有阈值集中在文件顶部的 `LIMITS` / `DIR_LIMIT`，接项目时先改这里，再改 `SKILL.md` 里的表格保持同步。
