// src/constants/index.ts

// Static application constants (never change)
export const APP_NAME = 'EvoNext'
export const APP_VERSION = '25.12.3'
export const APP_DESCRIPTION = 'Free and Fearless — Discover safe spaces to Explore. Curate. Share YOUR Truth — secured by Dash Platform.'

// Contract IDs
export const DUSD_CONTRACT_ID_MAINNET = 'DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd'
export const DUSD_CONTRACT_ID_TESTNET = '3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz'
export const EVONEXT_CONTRACT_ID_MAINNET = '6fBkKSne1xQ5GCPW9fdwEkH7nk8oYPu48vYiYssWzhX8'
export const EVONEXT_CONTRACT_ID_TESTNET = '465jdPpFCZefhb4g2k2FpCcrKpPYhJJskDqbGFsKu6wb'
export const SANS_CONTRACT_ID_MAINNET = 'AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB'
export const SANS_CONTRACT_ID_TESTNET = 'A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN199V7dLZ'

// Token Decimals (static token properties)
export const DUSD_DECIMAL_PLACES = 6
export const SANS_DECIMAL_PLACES = 8

// Other static configuration
export const UPDATER_ENDPOINT = 'https://releases.evonext.app/{{target}}/{{arch}}/{{current_version}}'

// Platform constants
export const MIN_CREDIT_TRANSFER = BigInt(100000) // 0.000001 DASH
export const DEFAULT_IDENTITY_SEARCH_LIMIT = 3
export const DEFAULT_SECURITY_LEVEL = 0
export const DEFAULT_QUERY_REGISTRY = false

// Helper functions for network-specific values
import { isTestnet } from '@/utils/env'

export function getDUSDContractId(): string {
  return isTestnet() ? DUSD_CONTRACT_ID_TESTNET : DUSD_CONTRACT_ID_MAINNET
}

export function getSANSContractId(): string {
  return isTestnet() ? SANS_CONTRACT_ID_TESTNET : SANS_CONTRACT_ID_MAINNET
}

export function getAllActiveTokens(): string[] {
  return isTestnet()
    ? [DUSD_CONTRACT_ID_TESTNET, SANS_CONTRACT_ID_TESTNET]
    : [DUSD_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_MAINNET]
}
