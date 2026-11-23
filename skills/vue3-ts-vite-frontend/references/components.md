---
description: SFC 骨架、Dialog 三层写法、props 预算与样式 token 约定。
---

# 组件：SFC 结构、Dialog、样式

## 1. 单文件组件骨架

统一顺序 `script → template → style`，只允许一个 `<script setup>`、一个 `<template>`、一个 `<style>`：

```vue
<script setup lang="ts">
// 1) type-only import 在最前
import type { User } from '../types'
// 2) 其他 import
import { computed, ref } from 'vue'

// 3) 类型与常量
interface Props {
  user: User
  readonly?: boolean
}
// 4) props / emits / model
const props = withDefaults(defineProps<Props>(), { readonly: false })
const emit = defineEmits<{ save: [user: User]; cancel: [] }>()
// 5) 状态
const saving = ref(false)
// 6) 计算
const displayName = computed(() => props.user.name || props.user.email)
// 7) 方法
async function onSave() {
  saving.value = true
  try {
    emit('save', props.user)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- 模板只做渲染与事件转发，不写业务计算 -->
</template>

<style scoped>
/* 只写本组件样式 */
</style>
```

规则：

- 顺序固定，便于 review 时快速定位（看到 `computed` 之后不该再有 import）。
- 只用 `<script setup lang="ts">`，不用 Options API / `defineComponent` 混写。
- 模板里不做计算：`{{ items.filter(...).length }}` 改 `computed`；复杂表达式抽函数。
- 模板里不写 `v-if="a && b || c && !d"` 这类复合条件，抽成 `const canEdit = computed(...)`。
- 一个文件一个组件。极小的图标/标签也要独立文件（`UserStatusTag.vue`），否则主文件缓慢膨胀。

## 2. 组件接口：props / emits / model

- props **下传**，emits **上抛**，禁止子组件改 props，也禁止子组件直接调用父级的 API 请求。
- props 用**类型声明式**，不用运行时对象式：`defineProps<{ user: User }>()`。
- 有默认值用 `withDefaults`；复杂默认值用工厂函数。
- 双向绑定用 `defineModel`：

```ts
const open = defineModel<boolean>('open', { default: false })
const keyword = defineModel<string>('keyword', { default: '' })
```

- emits 用类型字面量（Vue 3.3+）：`defineEmits<{ change: [value: string] }>()`。
- 布尔 prop 命名 `is/has/can/with`，避免 `disabled` 与 `isDisabled` 混用。
- **props ≤ 5 个、emits ≤ 3 个**。超标说明接口设计有问题，按下面处理：
  - 属性成组 → 收成一个对象 prop：`:form="form"` 代替 `:name :email :phone :role`；
  - 只是透传 → 用 `v-bind="$attrs"` + `inheritAttrs: false`，不要一个个声明；
  - 层级过深（父 → 子 → 孙 → 曾孙）→ `provide/inject` 或用 composable 直接取 store；
  - 想要自定义内容 → 用 slot，而不是加 `xxxText`、`xxxSlot` 这类 prop。

## 3. Dialog：一个 Dialog 一个文件

三层结构，缺一不可：

1. `shared/ui/dialog/BaseDialog.vue`：只管"壳"——遮罩、焦点、Esc、滚动锁、a11y。全项目只有一个。
2. `features/<x>/components/XxxDialog.vue`：只管"这一次业务"——表单、校验、调接口、成功回调。
3. `views/XxxView.vue`：只管"什么时候弹、弹完干什么"。

### 3.1 壳：BaseDialog.vue（原生 `<dialog>`，自带焦点陷阱与 Esc）

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const props = withDefaults(defineProps<{
  title?: string
  width?: string
  closeOnMask?: boolean
}>(), { title: '', width: '520px', closeOnMask: true })

const dialogEl = ref<HTMLDialogElement | null>(null)

watch(
  open,
  (value) => {
    const el = dialogEl.value
    if (!el) return
    if (value && !el.open) el.showModal()
    if (!value && el.open) el.close()
  },
  { flush: 'post', immediate: true },
)

function onCancel(event: Event) {
  // Esc：交给外部决定是否真的关
  event.preventDefault()
  open.value = false
}

function onMaskClick(event: MouseEvent) {
  if (!props.closeOnMask) return
  if (event.target === dialogEl.value) open.value = false
}

function onClose() {
  open.value = false
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="base-dialog"
    :style="{ width: props.width }"
    @cancel="onCancel"
    @click="onMaskClick"
    @close="onClose"
  >
    <header v-if="props.title" class="base-dialog__header">
      <h2 class="base-dialog__title">{{ props.title }}</h2>
    </header>
    <div class="base-dialog__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="base-dialog__footer">
      <slot name="footer" />
    </footer>
  </dialog>
</template>

<style scoped>
.base-dialog {
  padding: 0;
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.base-dialog::backdrop {
  background: var(--color-mask);
}
.base-dialog__header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
</style>
```

`<dialog>` + `showModal()` 天然解决了焦点陷阱、`aria-modal`、Esc、`::backdrop`、滚动锁，比手写遮罩层少一半 bug。用 UI 库（Element Plus / Ant Design Vue）时直接用它提供的 Dialog，但**业务 Dialog 仍然必须独立成文件**。

### 3.2 业务 Dialog

```vue
<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseDialog from '@/shared/ui/dialog/BaseDialog.vue'
import { toMessage } from '@/shared/api/errors'
import { updateUser } from '../api/user'
import type { User, UserForm } from '../types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: User | null }>()
const emit = defineEmits<{ saved: [user: User] }>()

const form = reactive<UserForm>({ name: '', email: '', role: 'member' })
const submitting = ref(false)
const errorMessage = ref<string | null>(null)

// 每次打开重置，避免上一次的脏数据残留（这是 Dialog 最常见的 bug）
watch(open, (value) => {
  if (!value || !props.user) return
  Object.assign(form, {
    name: props.user.name,
    email: props.user.email,
    role: props.user.role,
  })
  errorMessage.value = null
}, { immediate: true })

async function onSubmit() {
  if (!props.user || submitting.value) return
  submitting.value = true
  errorMessage.value = null
  try {
    const saved = await updateUser(props.user.id, { ...form })
    emit('saved', saved)
    open.value = false
  } catch (error) {
    errorMessage.value = toMessage(error) // 失败不关弹窗，错误留在弹窗里
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <BaseDialog v-model:open="open" title="编辑用户">
    <form id="user-edit-form" class="user-edit" @submit.prevent="onSubmit">
      <p v-if="errorMessage" class="user-edit__error" role="alert">{{ errorMessage }}</p>
      <!-- 字段多时再拆 UserFormFields.vue -->
    </form>
    <template #footer>
      <button type="button" class="btn" @click="open = false">取消</button>
      <button type="submit" class="btn btn--primary" form="user-edit-form" :disabled="submitting">
        {{ submitting ? '保存中…' : '保存' }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.user-edit__error {
  margin: 0 0 var(--space-3);
  color: var(--color-danger);
}
</style>
```

要点：

- `v-model:open` 是唯一开关状态来源，不要在 Dialog 内部再复制一份 `visible`。
- 打开时重置表单，关闭时不清空（清空交给"下次打开重置"），避免关闭动画期间白屏。
- 提交中禁用按钮 + 防重复提交（`submitting` 判断）。
- 失败不关闭，错误信息留在弹窗内，`role="alert"`。
- 需要"确认删除"这类不需要表单的，做成 `XxxConfirmDialog.vue`，不要复用编辑弹窗改文案。

### 3.3 一次打开多个弹窗

每个弹窗一个 `ref`，不要用 `currentDialog: 'edit' | 'delete' | null` 的单例状态塞三个 `v-if`——那会把三个弹窗的逻辑又合并回页面。

## 4. 表单

- 字段 ≤ 6 个：直接在 Dialog/页面的 form 里写。
- 字段 > 6 个或有联动：抽 `XxxFormFields.vue`（纯展示 + `v-model` 对象），校验规则独立 `xxx-schema.ts`。
- 校验消息统一来源（UI 库 rules 或 zod），不要在模板里写一串 `v-if` 判断错误文案。
- 提交按钮 loading 与 disabled 同源，防抖动。
- 离开未保存提醒只在"有明显损失"的表单做（长表单），别全站弹。

## 5. 列表与表格

- 列定义抽成常量/配置（`userColumns.ts`），页面里不写 8 个 `<el-table-column>`。
- 操作列超过 3 个动作：抽 `UserRowActions.vue` 或收进"更多"。
- 空态、加载态、错误态由 `BaseTable` 统一处理，业务页面不重复写 `v-if="!list.length"`。
- 分页/筛选放 URL query，刷新可还原。

## 6. 样式规范

### 6.1 就近 + scoped

```vue
<style scoped>
.user-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.user-card__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}
</style>
```

- 每个 `.vue` 必须有 `<style scoped>`（没有样式也要留空块或干脆不写 style，脚本只警告"写了 style 但没 scoped"）。
- class 用 `块__元素--修饰符`，块名 = 组件名 kebab-case。禁止 `div`、`.title`、`.content` 这类全局易撞名。
- 嵌套 ≤ 3 层（原生 CSS nesting 或 SCSS 都一样），超过说明结构有问题。
- 禁止在 scoped 里写标签选择器（`ul li a`），它会影响子组件且难覆盖。
- 禁止 `!important`，除了覆盖 UI 库（并加注释）。

### 6.2 颜色/间距/层级只用 token

```css
/* app/styles/tokens.css */
:root {
  --color-primary: #2563eb;
  --color-text: #111827;
  --color-border: #e5e7eb;
  --color-mask: rgb(0 0 0 / 45%);
  --color-danger: #dc2626;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --font-size-sm: 12px;
  --font-size-md: 14px;

  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 1000;
  --z-toast: 1100;
}
```

在 `.vue` 里出现字面量 `#hex`、`13px`、`z-index: 9999` 就应当在 review 里被要求改成变量。主题切换（暗色）只改 `tokens.css`，不动组件。

### 6.3 `:deep()` 与 Teleport 的坑

- scoped 样式对 `Teleport` 到 `body` 的内容**仍然生效**（Vue 会给节点加 scope id），但第三方弹窗内部节点不受控——覆盖时用 `:deep(.el-dialog__header)` 并注明来源。
- `v-html` 生成的内容拿不到 scope id，样式会失效：改用渲染函数/组件，或给容器加固定 class 后在全局 `vendor.css` 用命名空间包裹（`.rich-text :deep(...)`）。
- `:global()` 只能在组件内做局部全局化，禁止写裸 `body`、`*` 选择器。

### 6.4 响应式与单位

- 间距/字号用 `px` 或 token，不混用 `rem`（除非有整体缩放需求）。
- 移动端全屏高度用 `100dvh`，不用 `100vh`（地址栏塌陷）。
- 断点集中定义，不在组件里写魔法数字：`@media (max-width: 768px)` 统一为 `@media (--bp-md)`（或统一用 CSS 变量注释说明）。

## 7. 无障碍（最低要求，不是可选项）

- 弹窗必须有可访问名称（`<h2>` 或 `aria-label`），焦点进入弹窗、关闭后回到触发按钮。
- 图标按钮必须有 `aria-label`；纯装饰图标 `aria-hidden="true"`。
- 表单 `<label for>` 与控件 id 对应；错误信息用 `aria-describedby` 关联。
- 键盘可达：自定义可点击 `div` 必须是 `button`，或补 `role="button" tabindex="0" @keydown.enter @keydown.space`。
- 不要只靠颜色传达状态（成功/失败加图标或文字）。
