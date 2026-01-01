// src/stores/settings.ts

import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useDebounce } from '@/composables/useDebounce'
import type { ISettingsState } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
    const state = reactive<ISettingsState>({
        theme: 'system',
        network: 'testnet',
        notifications: {
            messages: true,
            mentions: true,
            contact_requests: false
        },
        profile: {
            display_name: '',
            username: '',
            bio: ''
        },
        isLoading: false,
        error: null,
        lastSaved: null,
    })

    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const lastSaved = ref<Date | null>(null)

    const debouncedSettings = useDebounce(() => state, 1000)

    const load = async () => {
        isLoading.value = true
        error.value = null
        try {
            const data = await invoke<Partial<ISettingsState>>('load_settings')
            Object.assign(state, {
                ...data,
                network: data?.network ?? 'testnet'
            })
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : 'Failed to load settings'
        } finally {
            isLoading.value = false
        }
    }

    const save = async (partial?: Partial<Pick<ISettingsState, 'theme' | 'network' | 'notifications' | 'profile'>>) => {
        isLoading.value = true
        error.value = null
        try {
            if (partial) {
                Object.assign(state, partial)
            }

            await invoke('save_settings', {
                settings: {
                    theme: state.theme,
                    network: state.network,
                    notifications: state.notifications,
                    profile: state.profile,
                }
            })

            lastSaved.value = new Date()
        } catch (err: unknown) {
            error.value = err instanceof Error ? err.message : 'Failed to save settings'
            throw err
        } finally {
            isLoading.value = false
        }
    }

    const setTheme = (theme: 'system' | 'light' | 'dark') => {
        state.theme = theme
        save({ theme })
    }

    const setNetwork = (network: 'testnet' | 'mainnet') => {
        state.network = network
        save({ network })
    }

    const updateProfile = (partial: Partial<ISettingsState['profile']>) => {
        state.profile = { ...state.profile, ...partial }
        save({ profile: state.profile })
    }

    const resetError = () => {
        error.value = null
    }

    // Auto-save on debounced state changes (optional)
    // watch(() => debouncedSettings.value, (settings) => {
    //     if (settings) save()
    // })

    return {
        state,
        isLoading,
        error,
        lastSaved,
        load,
        save,
        setTheme,
        setNetwork,
        updateProfile,
        resetError
    }
})
