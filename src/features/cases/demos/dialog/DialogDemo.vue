<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

interface Item {
  id: number
  name: string
}

const items = ref<Item[]>([
  { id: 1, name: '订单 #1024' },
  { id: 2, name: '订单 #1025' },
  { id: 3, name: '订单 #1026' },
])

const confirmOpen = ref(false)
const target = ref<Item | null>(null)
const openTimes = ref(0)
const history = ref<string[]>([])

function askRemove(item: Item) {
  target.value = item
  confirmOpen.value = true
  openTimes.value += 1
}

function record(message: string) {
  history.value = [message, ...history.value].slice(0, 5)
}

function onConfirm() {
  if (!target.value) return
  items.value = items.value.filter((item) => item.id !== target.value?.id)
  record(`已删除 ${target.value.name}`)
  target.value = null
}

function onCancel() {
  record('已取消（焦点回到刚才那个删除按钮，试试直接按回车）')
  target.value = null
}
</script>

<template>
  <div class="dlg-demo">
    <div class="dlg-demo__bar">
      <p class="dlg-demo__hint">
        点任意「删除」后再按 <kbd>Esc</kbd>：浏览器会把焦点还给触发按钮，不需要手写 restoreFocus。
      </p>
      <span class="dlg-demo__count">已打开 {{ openTimes }} 次</span>
    </div>

    <ul class="list">
      <li v-for="item in items" :key="item.id" class="list__row">
        <span class="list__name">{{ item.name }}</span>
        <button type="button" class="list__btn" @click="askRemove(item)">删除</button>
      </li>
      <li v-if="items.length === 0" class="list__row list__row--empty">列表已清空，刷新案例页可重来</li>
    </ul>

    <ul v-if="history.length > 0" class="history">
      <li v-for="line in history" :key="line" class="history__item">{{ line }}</li>
    </ul>

    <ConfirmDialog
      v-model:open="confirmOpen"
      :title="`删除 ${target?.name ?? ''}？`"
      message="删除后不可恢复。这个弹窗的开关、焦点与 Esc 都由原生 dialog 负责，业务组件只管确认后的动作。"
      confirm-text="删除"
      danger
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </div>
</template>

<style scoped>
.dlg-demo {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dlg-demo__bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
}

.dlg-demo__hint {
  max-width: 58ch;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.dlg-demo__hint kbd {
  padding: 0 5px;
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
}

.dlg-demo__count {
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.list__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
}

.list__row--empty {
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-faint);
}

.list__name {
  font-size: var(--font-size-sm);
}

.list__btn {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  background: transparent;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.list__btn:hover {
  border-color: var(--color-danger);
}

.history {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-faint);
  list-style: none;
  background: var(--color-code-bg);
  border-radius: var(--radius-sm);
}
</style>
