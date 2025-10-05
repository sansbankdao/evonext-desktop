/* Import modules. */
import { defineStore } from 'pinia'

export const useIdentityStore = defineStore('identity', {
    state: () => ({
        username: null as string | null,
        isAuthenticated: false,
        premiumAccess: false,
    }),
    actions: {
        login(username: string) {
            this.username = username
            this.isAuthenticated = true
        },
        logout() {
            this.username = null
            this.isAuthenticated = false
            this.premiumAccess = false
        },
        setPremiumAccess(hasAccess: boolean) {
            this.premiumAccess = hasAccess
        },
    },
    getters: {
        getGreeting: (state) => `Hello, ${state.username || 'Guest'}!`,
    },
})
