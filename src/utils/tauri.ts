// src/utils/tauri.ts

import { invoke as tauriInvoke } from '@tauri-apps/api/core'

export async function invoke<T>(command: string, args?: any): Promise<T> {
    const res = await tauriInvoke(command, args) as any
    if (res?.status === 'error' || res?.success === false) {
        throw new Error(res.error || `Command ${command} failed`)
    }
    // Return data, payload, or the response itself if not wrapped
    return (res?.data ?? res?.payload ?? res) as T
}
