// src/stores/settings.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { ISettingsState } from '@/types'

export const useSettingsStore = defineStore('settings', {
    state: (): ISettingsState => ({
        theme: 'system',
        network: 'testnet',
        notifications: {
            messages: true,
            mentions: true,
            contact_requests: false,
        },
        profile: {
            display_name: '',
            username: '',
            bio: '',
        },
        isLoading: false,
        error: null,
        lastSaved: null,
    }),

    actions: {
        /**
         * Fetches settings from the Rust backend.
         * In a real app, this would be called when the app starts.
         */
        async loadSettings() {
            this.isLoading = true
            this.error = null

            try {
                const loadedState = await invoke<Partial<ISettingsState>>('load_settings')

                this.$patch({
                    ...loadedState,
                    network: loadedState?.network || 'testnet'
                })
                console.log('Settings loaded successfully from backend.')
            } catch (err) {
                this.error = 'Failed to load settings from backend.'
                console.error(this.error, err)
            } finally {
                this.isLoading = false
            }
        },

        /**
         * Saves the current settings to the Rust backend.
         */
        async saveSettings(newSettings: Partial<ISettingsState>) {
            this.isLoading = true
            this.error = null

            try {
                this.$patch(newSettings)

                const settingsPayload = {
                    theme: this.theme,
                    network: this.network,
                    notifications: this.notifications,
                    profile: this.profile,
                }

                await invoke('save_settings', { settings: settingsPayload })

                this.lastSaved = new Date()
                console.log('Settings saved successfully to backend.')
            } catch (err) {
                this.error = 'Failed to save settings to backend.'
                console.error(this.error, err)
            } finally {
                this.isLoading = false
            }
        },

        setTheme(theme: 'system' | 'light' | 'dark') {
            this.theme = theme
            this.saveSettings({ theme })
        },

        setNetwork(network: 'testnet' | 'mainnet') {
            this.network = network
            this.saveSettings({ network })
        }
    },
})
