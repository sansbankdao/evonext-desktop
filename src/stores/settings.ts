import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

// Define the shape of our settings
export interface ProfileSettings {
    displayName: string;
    username: string;
    bio: string;
}

export interface NotificationSettings {
    messages: boolean;
    mentions: boolean;
    contactRequests: boolean;
}

export interface SettingsState {
    theme: 'system' | 'light' | 'dark';
    notifications: NotificationSettings;
    profile: ProfileSettings;
    isLoading: boolean;
    error: string | null;
    lastSaved: Date | null;
}

export const useSettingsStore = defineStore('settings', {
    state: (): SettingsState => ({
        theme: 'system',
        notifications: {
            messages: true,
            mentions: true,
            contactRequests: false,
        },
        profile: {
            displayName: '',
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
            this.isLoading = true;
            this.error = null;
            try {
                // --- TAURI INTEGRATION ---
                // Replace this with a real call to your Rust backend
                const loadedState = await invoke<Partial<SettingsState>>('load_settings_from_backend');

                // Merge loaded state with defaults
                this.$patch({ ...loadedState });

                console.log('Settings loaded successfully from backend.');
            } catch (err) {
                this.error = 'Failed to load settings from backend.';
                console.error(this.error, err);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Saves the current settings to the Rust backend.
         */
        async saveSettings(newSettings: Partial<SettingsState>) {
            this.isLoading = true;
            this.error = null;
            try {
                // Update the store's state immediately for a snappy UI
                this.$patch(newSettings);

                // --- TAURI INTEGRATION ---
                // Create a payload of the current state to send to Rust
                const settingsPayload = {
                    theme: this.theme,
                    notifications: this.notifications,
                    profile: this.profile,
                };

                await invoke('save_settings_to_backend', { settings: settingsPayload });

                this.lastSaved = new Date();
                console.log('Settings saved successfully to backend.');
            } catch (err) {
                this.error = 'Failed to save settings to backend.';
                console.error(this.error, err);
            } finally {
                this.isLoading = false;
            }
        },

        setTheme(theme: 'system' | 'light' | 'dark') {
            this.theme = theme;
            // Optionally auto-save when a simple setting like this changes
            this.saveSettings({ theme });
        }
    },
});
