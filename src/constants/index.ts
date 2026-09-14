// src/constants/index.ts

// Static application constants (never change)
export const APP_NAME = 'EvoNext'
export const APP_VERSION = '26.1.11'
export const APP_DESCRIPTION = 'Free and Fearless — Discover safe spaces to Explore. Curate. Share YOUR Truth — secured by Dash Platform.'

// Contract IDs
export const DASHPAY_CONTRACT_ID_MAINNET = 'Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7'
export const DASHPAY_CONTRACT_ID_TESTNET = 'Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7'
export const DPNS_CONTRACT_ID_MAINNET = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec'
export const DPNS_CONTRACT_ID_TESTNET = 'GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec'
export const DUSD_CONTRACT_ID_MAINNET = 'DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd'
export const DUSD_CONTRACT_ID_TESTNET = '3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz'
export const EVONEXT_CONTRACT_ID_MAINNET = '6fBkKSne1xQ5GCPW9fdwEkH7nk8oYPu48vYiYssWzhX8'
export const EVONEXT_CONTRACT_ID_TESTNET = '465jdPpFCZefhb4g2k2FpCcrKpPYhJJskDqbGFsKu6wb'
export const SANS_CONTRACT_ID_MAINNET = 'AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB'
export const SANS_CONTRACT_ID_TESTNET = 'A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN19UqUfM1kw'
export const WALLET_UTILS_CONTRACT_ID_MAINNET = '7CSFGeF4WNzgDmx94zwvHkYaG3Dx4XEe5LFsFgJswLbm'
export const WALLET_UTILS_CONTRACT_ID_TESTNET = '7CSFGeF4WNzgDmx94zwvHkYaG3Dx4XEe5LFsFgJswLbm'
// Yappr contract registry — AUTHORITATIVE IDs live in
// src-tauri/src/social/mod.rs (feed orchestration is Rust-side). These
// constants remain for legacy TS call sites only.
// Registry probe-verified 2026-09-11 against dapi.sansbank.dev: EWR695…
// is yappr's live v10 posts contract (latest en post 2026-09-08) and
// serves the languageTimeline index; the older AyWK6nD… generation
// (handoff §4) rejects language queries and went stale. Next migration
// candidate (upstream feat/medium-auth-keys): 9oDC6xdg… — not yet
// production. No Yappr contract is deployed on mainnet; empty string
// means "tier absent" (was 'TBD', which broke query builders downstream).
export const YAPPR_CONTRACT_ID_MAINNET = ''
export const YAPPR_CONTRACT_ID_TESTNET = 'EWR695MsqPUuW8EnTbYzD4KybNQD5n7CUDWydJYNg63F'
export const YAPPR_PROFILE_CONTRACT_ID_MAINNET = ''
export const YAPPR_PROFILE_CONTRACT_ID_TESTNET = 'FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe'

// Token Decimals (static token properties)
export const DUSD_DECIMAL_PLACES = 6
export const SANS_DECIMAL_PLACES = 8

// Other static configuration
export const UPDATER_ENDPOINT = 'https://manifest.evonext.app/desktop'

// Platform constants
export const MIN_CREDIT_TRANSFER = BigInt(100000) // 0.000001 DASH
export const DEFAULT_IDENTITY_SEARCH_LIMIT = 3
export const DEFAULT_SECURITY_LEVEL = 0
export const DEFAULT_QUERY_REGISTRY = false

// =========================================================================
// DYNAMIC NETWORK HELPERS
// =========================================================================
/**
 * Returns the DUSD Contract ID for the specified network
 */
export function getDUSDContractId(network: string): string {
    return network.toLowerCase() === 'testnet' ? DUSD_CONTRACT_ID_TESTNET : DUSD_CONTRACT_ID_MAINNET
}

/**
 * Returns the SANS Contract ID for the specified network
 */
export function getSANSContractId(network: string): string {
    return network.toLowerCase() === 'testnet' ? SANS_CONTRACT_ID_TESTNET : SANS_CONTRACT_ID_MAINNET
}

/**
 * Returns an array of active token contract IDs for the specified network
 */
export function getAllActiveTokens(network: string): string[] {
    return network.toLowerCase() === 'testnet'
        ? [DUSD_CONTRACT_ID_TESTNET, SANS_CONTRACT_ID_TESTNET]
        : [DUSD_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_MAINNET]
}

/**
 * Returns the list of active Post contracts for the specified network.
 * Testnet uses both EVONEXT and YAPPR.
 * Mainnet uses only EVONEXT.
 */
export function getActivePostContracts(network: string): string[] {
    const n = network.toLowerCase()
    if (n === 'testnet') {
        return [EVONEXT_CONTRACT_ID_TESTNET, YAPPR_CONTRACT_ID_TESTNET]
    }
    return [EVONEXT_CONTRACT_ID_MAINNET]
}
