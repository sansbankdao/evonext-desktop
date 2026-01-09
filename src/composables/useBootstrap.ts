// src/composables/useBootstrap.ts
import { ref, computed } from 'vue'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'

// API Endpoints
const DASH_QT_API = 'https://dashqt.org/v1/dapi'
const SANSBANK_API = 'https://sansbank.org/graphql'

// Contract Constants
const DUSHDATA_CONTRACT = 'Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7'
const DUSD_CONTRACT_ID = 'DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd'
const SANS_CONTRACT_ID = 'AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB'

// Interfaces
export interface IdentityProfile {
  avatarUrl?: string
  displayName?: string
  publicMessage?: string
}

export interface IdentityBalances {
  creditsBalanceDisplay: string
  dusdBalanceDisplay: string
  sansBalanceDisplay: string
}

export interface BootstrapIdentity {
  identityId: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
  dashAddr: string | null
  balances: IdentityBalances
}

export const useBootstrap = () => {
  // State
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const result = ref<BootstrapIdentity | null>(null)

  // Track current network
  const currentNetwork = ref<'testnet' | 'mainnet'>('mainnet')

  /**
   * Helper: Query DashQt API
   */
  const queryWebAPI = async (method: string, params: any[] = []): Promise<any> => {
    return ErrorBoundary.wrap(async () => {
      const body = JSON.stringify({ method, params, network: currentNetwork.value })
      log('debug', `[Bootstrap] DAPI ${method}`, params)

      const response = await fetch(DASH_QT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body
      })

      if (!response.ok) {
        if (response.status === 404) return { success: false, result: null }
        throw new Error(`DAPI Fetch Error: ${response.status}`)
      }

      return await response.json()
    }, 'QUERY_DAPI_FAILED')
  }

  /**
   * Helper: Format Numbers
   */
  const formatNumber = (value: number): string => {
    if (value === 0) return '0'
    const hasFraction = value % 1 !== 0

    if (hasFraction) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }).format(value)
    } else {
      return new Intl.NumberFormat('en-US').format(value)
    }
  }

  /**
   * 1. Resolve Identity ID (If input is a name, we need ID. If input IS ID, pass through)
   */
  const resolveIdentityId = async (input: string): Promise<string | null> => {
    // If input is already an ID (starts with X), pass through
    // Otherwise check via DAPI
    const res = await queryWebAPI('identity_fetch', [input])

    if (res?.success && res.result?.identityId) {
      return res.result.identityId
    }

    // Fallback: if input is long enough and starts with X, assume it's ID
    if (input.length > 40 && input.startsWith('X')) {
      return input
    }

    return null
  }

  /**
   * 2. Fetch Profile from DashPay Contract
   */
  const fetchProfile = async (identityId: string): Promise<{ data: any; url?: string } | null> => {
    try {
      const res = await queryWebAPI('get_documents', [
        DUSHDATA_CONTRACT,
        'profile',
        [['$ownerId', '==', identityId]]
      ])

      if (res?.success && Array.isArray(res.result) && res.result.length > 0) {
        return { data: res.result[0], url: res.result[0].avatarUrl }
      }
      return null
    } catch (err) {
      log('error', 'Failed to fetch profile', err)
      return null
    }
  }

  /**
   * 3. Fetch Dash Address via Sansbank GraphQL
   */
  const fetchDashAddress = async (identityId: string): Promise<string | null> => {
    try {
      const query = `mutation ManageAddress {
        manageAddress(action: "register", platformid: "${identityId}") {
          dashAddr
        }
      }`

      const res = await fetch(SANSBANK_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query })
      })

      const json = await res.json()

      const data = Array.isArray(json.data?.manageAddress)
        ? json.data.manageAddress[0]
        : json.data?.manageAddress

      return data?.dashAddr || null
    } catch (err) {
      log('error', 'Failed to fetch Dash Address from Sansbank', err)
      return null
    }
  }

  /**
   * 4. Fetch and Calculate Balances (Credits + Tokens)
   */
  const fetchBalances = async (identityId: string): Promise<IdentityBalances> => {
    try {
      const [creditRes, tokenRes] = await Promise.all([
        queryWebAPI('get_identity_balance', [identityId]),
        queryWebAPI('get_identity_token_balances', [identityId, [DUSD_CONTRACT_ID, SANS_CONTRACT_ID]])
      ])

      const creditsBalance = creditRes?.result?.balance
        ? BigInt(creditRes.result.balance)
        : BigInt(0)

      const tokens = tokenRes?.result || []
      const dusdToken = tokens.find((t: any) => t.tokenId === DUSD_CONTRACT_ID) || { balance: '0' }
      const sansToken = tokens.find((t: any) => t.tokenId === SANS_CONTRACT_ID) || { balance: '0' }

      const dusdBalance = BigInt(dusdToken.balance)
      const sansBalance = BigInt(sansToken.balance)

      const dashDisplay = formatNumber(Number(creditsBalance) / 100000000)
      const dusdDisplay = formatNumber(Number(dusdBalance) / 1000000)
      const sansDisplay = formatNumber(Number(sansBalance) / 100000000)

      return {
        creditsBalanceDisplay: dashDisplay,
        dusdBalanceDisplay: dusdDisplay,
        sansBalanceDisplay: sansDisplay
      }
    } catch (err) {
      log('error', 'Failed to fetch balances', err)
      return {
        creditsBalanceDisplay: '0',
        dusdBalanceDisplay: '0',
        sansBalanceDisplay: '0'
      }
    }
  }

  /**
   * Main Load Action (Auto-logic)
   */
  const load = async (identityId: string | null, network: 'testnet' | 'mainnet') => {
    if (!identityId) {
      error.value = 'No Identity ID provided.'
      result.value = null
      return
    }

    isSearching.value = true
    error.value = null
    result.value = null
    currentNetwork.value = network // Update network context

    try {
      // 1. Resolve ID (Passthrough if needed)
      const resolvedId = await resolveIdentityId(identityId)
      if (!resolvedId) throw new Error(`Identity "${identityId}" could not be found or resolved.`)

      // 2, 3, 4. Fetch Data in Parallel
      const [profile, dashAddr, balances] = await Promise.all([
        fetchProfile(resolvedId),
        fetchDashAddress(resolvedId),
        fetchBalances(resolvedId)
      ])

      // Try to find username in profile, fallback to ID substring
      const username = profile?.data?.displayName || 'User'

      result.value = {
        identityId: resolvedId,
        username: username,
        displayName: profile?.data?.displayName || username,
        avatar: profile?.data?.avatarUrl,
        bio: profile?.data?.publicMessage || '',
        dashAddr,
        balances
      }

    } catch (err: any) {
      error.value = err.message || 'Failed to load bootstrap data.'
    } finally {
      isSearching.value = false
    }
  }

  return {
    // State
    isSearching,
    error,
    result,
    currentNetwork,

    // Actions
    load
  }
}
