<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true">∅</span>
    <p class="empty__title">{{ title }}</p>
    <p v-if="description" class="empty__desc">{{ description }}</p>
    <div v-if="$slots.default" class="empty__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-7) var(--space-4);
  text-align: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
}

.empty__icon {
  font-size: var(--font-size-2xl);
  color: var(--color-text-faint);
}

.empty__title {
  font-weight: 600;
}

.empty__desc {
  max-width: 42ch;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.empty__action {
  margin-top: var(--space-3);
}
</style>
