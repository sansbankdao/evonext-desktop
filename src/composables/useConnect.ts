// src/composables/useConnect.ts
import { ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import getNetwork from '@/libs/getNetwork'
import { useConnectStore } from '@/stores/connect'
import { useIdentityStore } from '@/stores/identity'
import { getIdentityManager } from '@/services/identity'
import type { DiscoveredIdentity } from '@/services/identity/types'

// Simple notification system
const useNotifications = () => {
    const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        // Create notification element
        const notification = document.createElement('div')
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-emerald-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-amber-500 text-white' :
            'bg-blue-500 text-white'
        }`

        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${
                        type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' :
                        type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' :
                        type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' :
                        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'
                    }
                </svg>
                <span>${message}</span>
            </div>
        `

        // Add to DOM
        document.body.appendChild(notification)

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.remove('translate-x-full')
            notification.classList.add('translate-x-0')
        })

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('translate-x-0')
            notification.classList.add('translate-x-full')
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification)
                }
            }, 300)
        }, 3000)
    }

    return {
        showSuccess: (message: string) => showNotification(message, 'success'),
        showError: (message: string) => showNotification(message, 'error'),
        showWarning: (message: string) => showNotification(message, 'warning'),
        showInfo: (message: string) => showNotification(message, 'info')
    }
}

export function useConnect() {
    const router = useRouter()
    const connectStore = useConnectStore()
    const identityStore = useIdentityStore()
    const { showSuccess, showError } = useNotifications()

    // Derived refs with proper typing
    const manualIdentityId = ref(connectStore.manualIdentityId || '')

    // Sync manualIdentityId with store
    watch(manualIdentityId, (newValue) => {
        connectStore.manualIdentityId = newValue
    })

    watch(() => connectStore.manualIdentityId, (newValue) => {
        if (manualIdentityId.value !== newValue) {
            manualIdentityId.value = newValue
        }
    })

    // Auto-search when all seed words are filled (debounced)
    watch(() => connectStore.seedWords, (newWords, oldWords) => {
        if (connectStore.seedSearchTimer) {
            clearTimeout(connectStore.seedSearchTimer)
        }

        if (connectStore.connectionMethod === 'seed' &&
            newWords.length === parseInt(connectStore.seedWordCount) &&
            newWords.every(word => word.trim() !== '') &&
            (!oldWords || newWords.some((word, i) => word !== oldWords?.[i]))) {

            if (!connectStore.isSearchingSeed && connectStore.seedDiscoveryResults.length === 0) {
                connectStore.seedSearchTimer = setTimeout(async () => {
                    await handleDiscoverSeedIdentities()
                }, 1000) // 1 second debounce
            }
        }
    }, { deep: true })

    const formatBalance = (balance: string | undefined | number): string => {
        if (balance === undefined || balance === null) return '0'
        const num = typeof balance === 'number' ? balance : parseInt(balance.toString(), 10)
        if (isNaN(num)) return '0'
        return new Intl.NumberFormat().format(num)
    }

    const updateConnectionMethod = (method: 'seed' | 'privateKey') => {
        connectStore.updateConnectionMethod(method)
    }

    const handlePaste = (words: string[]) => {
        connectStore.handlePaste(words)
    }

    const selectSeedIdentity = (identity: DiscoveredIdentity) => {
        connectStore.selectSeedIdentity(identity)
    }

    const handleDiscoverSeedIdentities = async (): Promise<void> => {
        if (connectStore.seedWords.some(word => !word.trim())) {
            identityStore.setConnectionError('Please fill in all seed words')
            showError('Please fill in all seed words')
            return
        }

        const seedPhrase = connectStore.seedWords.join(' ').trim()
        if (seedPhrase.split(/\s+/).length !== parseInt(connectStore.seedWordCount)) {
            identityStore.setConnectionError(`Please enter exactly ${connectStore.seedWordCount} words`)
            showError(`Please enter exactly ${connectStore.seedWordCount} words`)
            return
        }

        connectStore.isSearchingSeed = true
        connectStore.seedDiscoveryResults = []
        connectStore.seedDiscoveryError = ''
        identityStore.clearConnectionError()

        console.log(`[Connect] Starting seed discovery for ${connectStore.seedWordCount} word phrase`)

        try {
            const network = await getNetwork()
            console.log(`[Connect] Network: ${network}`)

            const identityManager = getIdentityManager()
            const result = await identityManager.discoverFromSeed(seedPhrase, {
                network,
                maxIdentityIndex: 5
            })

            console.log('[Connect] Seed discovery result:', result)

            if (result.success && result.identities && result.identities.length > 0) {
                connectStore.seedDiscoveryResults = result.identities
                if (result.identities.length === 1) {
                    // Auto-select if only one identity found
                    connectStore.selectedSeedIdentityId = result.identities[0].identityId
                    connectStore.manualIdentityId = result.identities[0].identityId
                }
                connectStore.debugOutput = result.debug
                showSuccess(`Found ${result.identities.length} identities`)
            } else {
                const errorMsg = result.error || 'No identities found for this seed phrase'
                connectStore.seedDiscoveryError = errorMsg
                connectStore.debugOutput = result.debug
                showError(errorMsg)
            }
        } catch (error: any) {
            console.error('[Connect] Seed discovery error:', error)
            const errorMsg = error.message || 'Failed to discover identities from seed'
            connectStore.seedDiscoveryError = errorMsg
            connectStore.debugOutput = { error: error.message, stack: error.stack }
            showError('Seed discovery failed')
        } finally {
            connectStore.isSearchingSeed = false
        }
    }

    const handleDiscoverIdentity = async (key: string): Promise<void> => {
        if (!key.trim()) {
            identityStore.setConnectionError('Please enter a private key or public key')
            showError('Please enter a private key or public key')
            return
        }

        connectStore.isDiscovering = true
        identityStore.clearConnectionError()
        connectStore.debugOutput = null
        connectStore.discoveredIdentity = null
        connectStore.discoveryDetails = null
        connectStore.currentInputKey = key

        console.log(`[Connect] Starting key discovery: ${key.substring(0, 20)}...`)

        try {
            const network = await getNetwork()
            console.log(`[Connect] Network: ${network}`)

            const identityManager = getIdentityManager()
            const result = await identityManager.discoverFromKey(key, { network })
            console.log('[Connect] Key discovery result:', result)

            connectStore.debugOutput = result.debug || { step: 'unknown' }

            if (result.success && result.identity) {
                connectStore.discoveredIdentity = result.identity
                connectStore.manualIdentityId = result.identity.identityId
                identityStore.clearConnectionError()

                connectStore.discoveryDetails = {
                    detectedKeyType: result.detectedKeyType || 'Unknown',
                    keyDescription: 'Key successfully discovered identity',
                    keyIcon: 'CheckCircleIcon',
                    associatedKeys: result.associatedKeys || []
                }

                console.log(`[Connect] Identity found: ${result.identity.identityId}`)
                showSuccess('Identity discovered successfully')
            } else {
                const errorMsg = result.error || 'No identity found. Please enter Identity ID manually.'
                identityStore.setConnectionError(errorMsg)
                showError(errorMsg)
                console.log('[Connect] Discovery failed:', result.error)
            }
        } catch (error: any) {
            console.error('[Connect] Key discovery error:', error)
            const errorMsg = error.message || 'Failed to discover identity'
            identityStore.setConnectionError(errorMsg)
            connectStore.debugOutput = { error: error.message, stack: error.stack }
            showError('Key discovery failed')
        } finally {
            connectStore.isDiscovering = false
        }
    }

    const handleConnectWithSeed = async (network: 'mainnet' | 'testnet'): Promise<void> => {
        const seedPhrase = connectStore.seedWords.join(' ').trim()

        // If we have discovery results and a selected identity, use that
        let identityId = connectStore.selectedSeedIdentityId
        if (!identityId && connectStore.seedDiscoveryResults.length > 0) {
            identityId = connectStore.seedDiscoveryResults[0].identityId
        }

        if (!identityId) {
            // No specific identity selected, discover first
            await handleDiscoverSeedIdentities()
            if (connectStore.seedDiscoveryResults.length === 0) {
                connectStore.seedDiscoveryError = 'No identities found. Please try again or use private key method.'
                showError('No identities found. Please try again or use private key method.')
                return
            }
            identityId = connectStore.seedDiscoveryResults[0].identityId
        }

        console.log(`[Connect] Connecting with seed phrase to identity: ${identityId}`)

        const result = await identityStore.connectWithSeed(seedPhrase, network)

        if (result.success) {
            console.log('[Connect] Seed connection successful')
            showSuccess('Connected successfully!')
            router.push('/')
        } else {
            identityStore.setConnectionError(result.error || 'Failed to connect with seed phrase')
            showError('Connection failed')
        }
    }

    const handleConnectWithKey = async (network: 'mainnet' | 'testnet'): Promise<void> => {
        const identityId = connectStore.discoveredIdentity?.identityId || connectStore.manualIdentityId.trim()

        if (!identityId) {
            identityStore.setConnectionError('Please discover your identity or enter it manually')
            showError('Please discover your identity or enter it manually')
            return
        }

        if (!connectStore.currentInputKey.trim()) {
            identityStore.setConnectionError('No private key provided')
            showError('No private key provided')
            return
        }

        console.log(`[Connect] Connecting with key to identity: ${identityId}`)

        const result = await identityStore.connectWithSingleKey(
            connectStore.currentInputKey,
            identityId,
            network
        )

        if (result.success) {
            console.log('[Connect] Key connection successful')
            showSuccess('Connected successfully!')
            router.push('/')
        } else {
            identityStore.setConnectionError(result.error || 'Failed to connect with private key')
            showError('Connection failed')
        }
    }

    const handleConnect = async (): Promise<void> => {
        if (!connectStore.isFormValid) {
            showError('Please complete the form')
            return
        }

        identityStore.clearConnectionError()
        connectStore.seedDiscoveryError = ''

        try {
            const network = await getNetwork()
            console.log(`[Connect] Network: ${network}`)

            if (connectStore.connectionMethod === 'seed') {
                await handleConnectWithSeed(network)
            } else {
                await handleConnectWithKey(network)
            }
        } catch (error: any) {
            console.error('[Connect] Connection error:', error)
            identityStore.setConnectionError(error.message || 'Connection failed')
            showError('Connection failed')
        }
    }

    const resetDiscovery = () => {
        connectStore.resetDiscovery()
    }

    const useManualIdentityAction = () => {
        connectStore.useManualIdentity()
    }

    const initialize = () => {
        console.log('[Connect] Component initialized')
        // Try to load existing identity from storage
        identityStore.initFromStorage().catch(console.error)
    }

    const cleanup = () => {
        connectStore.cleanup()
        const identityManager = getIdentityManager()
        identityManager.cleanup()
    }

    return {
        // Formatting
        formatBalance,

        // Methods
        handleDiscoverSeedIdentities,
        handleDiscoverIdentity,
        handleConnect,
        resetDiscovery,
        useManualIdentity: useManualIdentityAction,
        updateConnectionMethod,
        handlePaste,
        selectSeedIdentity,
        initialize,
        cleanup,

        // Store state
        connectionMethod: connectStore.connectionMethod,
        seedWordCount: connectStore.seedWordCount,
        seedWords: connectStore.seedWords,
        selectedSeedIdentityId: connectStore.selectedSeedIdentityId,
        seedDiscoveryResults: connectStore.seedDiscoveryResults,
        seedDiscoveryError: connectStore.seedDiscoveryError,
        isSearchingSeed: connectStore.isSearchingSeed,
        currentInputKey: connectStore.currentInputKey,
        debugOutput: connectStore.debugOutput,
        discoveredIdentity: connectStore.discoveredIdentity,
        discoveryDetails: connectStore.discoveryDetails,
        manualIdentityId,
        isDiscovering: connectStore.isDiscovering,

        // Computeds
        isFormValid: connectStore.isFormValid,
        discoveryStatus: connectStore.discoveryStatus,

        // Identity store state
        connectionError: () => identityStore.connectionError,
        isConnecting: () => identityStore.isConnecting
    }
}
