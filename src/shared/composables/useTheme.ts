import { readonly, ref } from 'vue'

export type ThemeName = 'light' | 'dark'

const STORAGE_KEY = 'mk-theme'
const root = document.documentElement
const current = ref<ThemeName>(root.dataset.theme === 'dark' ? 'dark' : 'light')

function apply(next: ThemeName) {
  current.value = next
  root.dataset.theme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 隐私模式下写不进 localStorage，忽略即可，主题仍在内存中生效
  }
}

export function useTheme() {
  function toggle() {
    apply(current.value === 'dark' ? 'light' : 'dark')
  }

  return { theme: readonly(current), toggle }
}
