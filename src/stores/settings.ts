// src/stores/settings.ts

import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
// import { useDebounce } from '@/composables/useDebounce'
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

    // const debouncedSettings = useDebounce(() => state, 1000)

    const load = async () => {
        state.isLoading = true
        state.error = null
        try {
            const data = await invoke<Partial<ISettingsState>>('load_settings')
            Object.assign(state, {
                ...data,
                network: data?.network ?? 'testnet'
            })
        } catch (err: unknown) {
            state.error = err instanceof Error ? err.message : 'Failed to load settings'
        } finally {
            state.isLoading = false
        }
    }

    const save = async (partial?: Partial<Pick<ISettingsState, 'theme' | 'network' | 'notifications' | 'profile'>>) => {
        state.isLoading = true
        state.error = null
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

            state.lastSaved = new Date()
        } catch (err: unknown) {
            state.error = err instanceof Error ? err.message : 'Failed to save settings'
            throw err
        } finally {
            state.isLoading = false
        }
    }

    // Alias for backward compatibility (if components use saveSettings)
    const saveSettings = (partial?: Partial<Pick<ISettingsState, 'theme' | 'network' | 'notifications' | 'profile'>>) => {
        return save(partial)
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
        state.error = null
    }

    // Return with proper typing
    return {
        // State (accessible as Settings.state)
        state,

        // Actions
        load,
        save,
        saveSettings, // Add this alias
        setTheme,
        setNetwork,
        updateProfile,
        resetError
    }
})
