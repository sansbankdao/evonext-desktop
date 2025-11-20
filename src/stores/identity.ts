// src/stores/identity.ts

/* Import modules. */
import { defineStore } from 'pinia'

import init, {
    WasmSdkBuilder,
    // identity_fetch,
    dpns_resolve_name,
    // get_dpns_usernames,
    // get_documents,
    // get_identity_token_balances,
    prefetch_trusted_quorums_mainnet,
} from '@/libs/dash/wasm_sdk.js'

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
