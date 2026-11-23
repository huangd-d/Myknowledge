<script setup lang="ts">
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  { confirmText: '确认', cancelText: '取消', danger: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)

// showModal() 负责焦点陷阱、aria-modal 与 ::backdrop，关闭时浏览器自动把焦点还给触发元素
watch(
  open,
  (value) => {
    const el = dialogEl.value
    if (!el) return
    if (value && !el.open) el.showModal()
    else if (!value && el.open) el.close()
  },
  { flush: 'post' },
)

function settle(confirmed: boolean) {
  open.value = false
  if (confirmed) emit('confirm')
  else emit('cancel')
}

function onCancel(event: Event) {
  // Esc：先拦截，再决定是否真的关闭
  event.preventDefault()
  settle(false)
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === dialogEl.value) settle(false)
}
</script>

<template>
  <dialog ref="dialogEl" class="dlg" @cancel="onCancel" @click="onBackdropClick">
    <h2 class="dlg__title">{{ title }}</h2>
    <p class="dlg__message">{{ message }}</p>
    <div class="dlg__actions">
      <button type="button" class="dlg__btn" autofocus @click="settle(false)">{{ cancelText }}</button>
      <button
        type="button"
        class="dlg__btn dlg__btn--primary"
        :class="{ 'dlg__btn--danger': danger }"
        @click="settle(true)"
      >
        {{ confirmText }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
.dlg {
  width: min(420px, calc(100vw - 32px));
  padding: var(--space-5);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.dlg::backdrop {
  background: rgb(9 12 18 / 45%);
  backdrop-filter: blur(2px);
}

.dlg__title {
  font-size: var(--font-size-lg);
  font-weight: 650;
}

.dlg__message {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-muted);
}

.dlg__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-5);
}

.dlg__btn {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.dlg__btn:hover {
  border-color: var(--color-border-strong);
}

.dlg__btn--primary {
  color: var(--color-on-accent);
  background: var(--color-accent);
  border-color: transparent;
}

.dlg__btn--danger {
  background: var(--color-danger);
}
</style>
