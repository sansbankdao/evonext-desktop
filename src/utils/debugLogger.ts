import { ref } from 'vue'
const logs = ref<{ timestamp: string; message: string; type: 'info' | 'error' | 'warn' }[]>([])
export const useDebugLogger = () => {
  const log = (message: string, type: 'info' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    logs.value.unshift({ timestamp, message, type })
    // Keep last 50 logs
    if (logs.value.length > 50) logs.value.pop()
  }
  const clear = () => {
    logs.value = []
  }
  return {
    logs,
    log,
    clear
  }
}
// Export a singleton instance for easy importing in stores
export const debugLogger = {
  log: (message: string, type: 'info' | 'error' | 'warn' = 'info') => {
    // We instantiate it here to access the ref, but usually we'd use the composable in the component.
    // For store usage, we'll push to a global array if needed, but let's stick to the composable in Vue files.
    // However, stores can't easily use composables.
    // Fallback: console.log for stores, but we will use a global event bus or just Window object for this specific task.
    // STRATEGY CHANGE: Using a simple global array for stores to write to, Vue component reads it.
    if (!(window as any).debugLogs) {
      ;(window as any).debugLogs = []
    }
    ;(window as any).debugLogs.unshift({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    })
  }
}
