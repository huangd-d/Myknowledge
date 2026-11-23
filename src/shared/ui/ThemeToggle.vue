<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/shared/composables/useTheme'

const { theme, toggle } = useTheme()

const nextLabel = computed(() => (theme.value === 'dark' ? '切换到浅色主题' : '切换到深色主题'))
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="nextLabel"
    :title="nextLabel"
    @click="toggle"
  >
    <span aria-hidden="true">{{ theme === 'dark' ? '☾' : '☀' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  font-size: var(--font-size-lg);
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.theme-toggle:hover {
  color: var(--color-accent-text);
  border-color: var(--color-border-strong);
}
</style>
