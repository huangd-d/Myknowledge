---
description: oxlint/oxfmt/vue-tsc/vitest 配置、CI 门禁、豁免机制与落地节奏。
---

# 工具链与质量门禁（oxlint + oxfmt + vue-tsc + vitest）

## 0. 先厘清职责（很重要的一个纠正）

| 工具 | 职责 | 对 `.vue` 的边界 |
| --- | --- | --- |
| `oxlint` | 静态检查（lint） | 主要覆盖 `<script>`；**模板规则不完整**，需要 `eslint-plugin-vue` 兜底 |
| `oxfmt` | 格式化（format） | 能格式化 `.vue` 里的 `<script>` / `<style>`；**不重排 `<template>` 结构** |
| `vue-tsc` | 类型检查 | 唯一能做类型检查的；`vite build` 只转译，不做类型检查 |
| `vitest` | 单测 | — |
| 自定义脚本 | 目录/行数/依赖方向 | 见 `scripts/check-frontend-rules.mjs` |

结论：**"用 oxlint 做格式化"是做不到的**，正确说法是"用 oxlint 做 lint、oxfmt 做格式化"。如果团队坚持单一工具链、且模板也要自动排版，方案是 `oxfmt`（代码）+ 保留 `prettier`（只跑 `*.vue` 模板）——不要两个都跑全量，会互相打架。

## 1. oxlint

`.oxlintrc.json`：

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["eslint", "typescript", "unicorn", "oxc", "import", "promise", "vitest"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "perf": "warn"
  },
  "env": {
    "browser": true,
    "es2024": true
  },
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "eqeqeq": "error",
    "no-var": "error",
    "prefer-const": "error",
    "no-alert": "error",
    "no-param-reassign": "warn",
    "typescript/no-explicit-any": "error",
    "typescript/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "typescript/consistent-type-imports": "warn",
    "import/no-cycle": "warn"
  },
  "ignorePatterns": ["dist/**", "coverage/**", "node_modules/**", "*.d.ts"]
}
```

- 规则名以本机 `oxlint --rules` 的实际输出为准（版本间会改名），配置不生效时先跑这条命令。
- Vue 专用规则：若当前 oxlint 版本尚未内置 `vue` 插件，模板层用 `eslint-plugin-vue` 的 `flat/recommended` 单独跑，或至少开启 `vue/multi-word-component-names`、`vue/no-v-html` 两条人工守则。
- 命令：

```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

## 2. oxfmt

`.oxfmtrc.json`：

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto"
}
```

```json
{
  "scripts": {
    "format": "oxfmt .",
    "format:check": "oxfmt --check ."
  }
}
```

- 首次引入时**先单独提交一次"纯格式化"提交**，否则 review 会淹没在十万行 diff 里。
- `--check` 若当前版本不支持，降级为 `oxfmt . && git diff --exit-code`。
- 模板结构（属性换行、多属性一行还是多行）建议只写进 review 约定，不指望工具：一行最多 3 个属性，超过换行。

## 3. TypeScript

`tsconfig.app.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "src/**/*.d.ts"]
}
```

- `vue-tsc --noEmit -p tsconfig.app.json` 必须进 CI。Vite 用 esbuild 转译，类型错误不会让 build 失败——这是"本地能跑、CI 红了"的常见来源。
- `noUncheckedIndexedAccess` 会让 `arr[0]` 变成可能 `undefined`，存量项目可以后开，新项目必开。
- `env.d.ts` 声明环境变量：

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_APP_TITLE: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 4. Vite

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          vendor: ['axios', 'dayjs'],
        },
      },
    },
  },
})
```

- 别名只能有一套（`@` → `src`），tsconfig 与 vite 必须一致，否则 IDE 与构建行为不同。
- 大依赖（图表、编辑器、地图）用 `defineAsyncComponent` + `import()` 懒加载，不要塞进首屏。
- 环境变量只放非敏感配置；`.env.local` 不进 git；`VITE_` 前缀的内容会进构建产物，**永远不要放密钥**。

## 5. Vitest

```ts
// vitest.config.ts
import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      globals: true,
      include: ['src/**/*.{test,spec}.ts'],
      coverage: { provider: 'v8', reporter: ['text', 'lcov'], exclude: ['**/*.d.ts', '**/types.ts'] },
    },
  }),
)
```

测什么（按性价比排序）：

1. `utils/`、`mappers` 等纯函数：必须有；
2. composable 的业务逻辑：用 `effectScope` + mock api 测状态流转与取消；
3. 复杂组件：用 `@vue/test-utils` 测交互（打开弹窗、校验失败、提交成功）；
4. 关键路径 e2e：Playwright 只覆盖登录 + 主流程，别追求全覆盖；
5. 不测：纯样式、UI 库内部行为、快照（除极少数）。

## 6. 一键校验 + CI

`package.json`：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit -p tsconfig.app.json && vite build",
    "preview": "vite preview",
    "lint": "oxlint",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "typecheck": "vue-tsc --noEmit -p tsconfig.app.json",
    "check:rules": "node scripts/check-frontend-rules.mjs src",
    "test": "vitest",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm check:rules && pnpm test -- --run"
  }
}
```

`.github/workflows/ci.yml`：

```yaml
name: ci
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm check:rules
      - run: pnpm test -- --run
      - run: pnpm build
```

GitLab 同理，换成 stages + `pnpm verify`。

## 7. 提交前钩子

```json
{
  "lint-staged": {
    "*.{ts,tsx,vue,js,mjs}": ["oxfmt --no-error-on-unmatched-pattern", "oxlint --fix"],
    "*.{css,scss,json,md}": ["oxfmt"]
  }
}
```

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
echo "pnpm exec lint-staged" > .husky/pre-commit
```

用 `lefthook` 也可以（单二进制、并行更快）。钩子只做"快"的检查（格式化 + lint），类型检查和测试留给 CI，否则每次提交等 40 秒，最后大家都会 `--no-verify`。

## 8. 编辑器

`.vscode/settings.json`：

```json
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.oxlint": "explicit" },
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.server.hybridMode": true
}
```

`.vscode/extensions.json`：`Vue.volar`、`oxc.oxc-vscode`。关闭内置 TS 校验，避免 Volar 与 tsserver 双份报错。

## 9. 自定义规则脚本

```bash
node scripts/check-frontend-rules.mjs src          # 人读格式
node scripts/check-frontend-rules.mjs src --json   # 给 CI 聚合
node scripts/check-frontend-rules.mjs src --allow-barrels
```

检查项：

| 规则 | 内容 |
| --- | --- |
| `size/*` | 文件行数分级（view / 组件 / composable / store / 默认） |
| `naming/*` | 组件 PascalCase、composable `useXxx.ts`、其他 ts 小写 |
| `architecture/feature-cross-import` | feature 之间禁止互相引用 |
| `architecture/layer-violation` | `shared` 不得引用 `features`/`app`；`features` 不得引用 `app` |
| `architecture/import-outside-src` | 相对 import 解析后落在 `src/` 之外（例如 `../../../../skills/x.md`） |
| `architecture/glob-outside-src` | `import.meta.glob()` 的模式落到 `src/` 之外（把 agent 资产卷进构建） |
| `architecture/generic-directory` | `features/*/utils|common|helpers|misc|lib` 下文件 ≥ 4 个（万能桶，内聚性差） |
| `architecture/barrel-file` | `features/*/index.ts` 报错（可用参数关闭） |
| `component/single-component` | 一个 `.vue` 里出现多个 `<template>` |
| `style/not-scoped` | 写了 `<style>` 但没 `scoped` |
| `style/hardcoded-color` | `style` 块里出现 `#hex`（info，提示用 token） |
| `leak/missing-cleanup` | 出现 `addEventListener`/`setInterval`/`new *Observer` 等，但全文件没有任何清理调用 |
| `security/v-html` | 使用 `v-html`（info） |

脚本退出码：有 `error` 时为 1，`warn`/`info` 只打印不影响退出码——**先让团队看到，再逐步收紧**。

### 边界检查为什么重要

`import-outside-src` 与 `glob-outside-src` 保护的是**发布边界**，不是代码风格：

- 构建只应依赖 `src/` + 配置文件。一旦 `import.meta.glob('../../../skills/**')` 出现在 `src` 里，`skills/` 就成了隐式的构建输入，删它、改它、把它从仓库里挪走，都会让线上构建失败。
- 这类越界很难在 review 里看出来，因为路径看起来只是"多几个点"。机器检查比人眼可靠。
- 如果确实需要跨目录读取（monorepo 里的 `packages/content`），把它显式配置成 alias 并在构建配置里声明，而不是用相对路径一路 `../..`。

## 10. 例外机制（避免规范变教条）

在文件头部 20 行内写豁免声明：

```ts
// frontend-rules-ignore: size/component, architecture/barrel-file
// 原因：历史遗留订单页，Q3 重构；负责人：@zhang
```

脚本会跳过该文件的对应规则。另外两条约定：

- 豁免必须写原因和负责人，**不接受"临时先这样"**；
- 每季度扫一遍所有 `frontend-rules-ignore`，能删的删掉。

## 11. 落地路线（不要一次全上）

| 阶段 | 做什么 | 目标 |
| --- | --- | --- |
| 第 1 周 | 装 oxfmt + oxlint + vue-tsc，跑一次格式化并单独提交 | 工具链通，CI 有类型检查 |
| 第 2 周 | 接入 `check-frontend-rules.mjs`，**只开 warn 不开 error** | 看清存量问题分布 |
| 第 3 周 | 目录按 feature 重排，新代码强制规范 | 新增代码 100% 合规 |
| 第 4 周 | 把 error 打开（行数 1000 先开，400 后开） | 红线上 CI |
| 之后 | 存量"触碰即改"，每季度提高一档阈值 | 逐步收敛，不搞大重构 |

规范落地的真正关键不是文档写得多细，而是两个数字：**新 PR 是否被卡住**、**豁免清单是否在变短**。

## 12. PR 模板：把设计问题问在提交时

目录规范和结构问题几乎不会在 CI 里暴露，只能靠提交时的自检。把清单放进 `.github/pull_request_template.md`，比放进 wiki 有效得多：

```md
## 这个 PR 做了什么

## 新增目录 / 文件
- [ ] 过了"建目录三问"：低耦合、高内聚、可读（一句话说明为什么需要这个目录）
- [ ] 没把文件放进 `utils/`、`common/`、`misc/` 这类万能桶
- [ ] 没有跨 feature import（`check:rules` 通过）
- [ ] Dialog / 抽屉 / 表单区块独立成文件，没有塞进页面

## 体积
- [ ] 没有文件超过 400 行（1000 行必须拆）

## 副作用
- [ ] 新增的监听 / 定时器 / 观察器 / 请求都有对应清理

## 资产边界
- [ ] `src` 里没有 import 或 glob 到 `skills/`、`docs/` 等站外目录

## 验证
- [ ] `pnpm verify` 通过
- [ ] 涉及样式：颜色 / 间距只用 token，没有硬编码色值
```

三条使用建议：

- 清单**只留能被回答"是/否"的项**，不要写"代码质量良好"这种没法验证的话；
- 新增目录的那条要求**写一句理由**，理由写不出来通常就是不该建；
- 每季度删掉一条已经形成肌肉记忆的项，保持清单在 10 条以内，否则没人看。
