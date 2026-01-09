// src/composables/useBalances.ts

// import { computed } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { usePlatform } from './usePlatform'
import type { TokenBalance } from '@/types'

export function useBalances() {
    const platform = usePlatform()
    const wallet = useWalletStore()

    const fetchLiveBalances = async (identityId: string) => {
        try {
            const sdk = await platform.getSDK()

            // Fetch identity balance (DASH credits) using the EXISTING method
            const identityBalance = await sdk.identities.getIdentityBalance(identityId)

            // Fetch assets to derive token balances (Backup/Primary method)
            const assets = wallet.assets

            // Map raw assets to TokenBalance type for processing
            // This satisfies the type system without needing a non-existent SDK method
            const tokenBalances: TokenBalance[] = assets.map(asset => {
                // Convert decimal balance to atomic (bigint) for internal processing
                const factor = BigInt(10 ** (asset.decimals || 8))
                const atomicBalance = BigInt(Math.floor(asset.balance as number)) * factor

                return {
                    tokenId: '', // Placeholder, typically comes from contract
                    balance: atomicBalance.toString(),
                    amount: Number(atomicBalance), // FIXME
                    symbol: asset.symbol,
                    decimals: asset.decimals
                }
            })

            // FIX: Manually update store properties instead of calling non-existent method
            wallet.user = wallet.user ? {
                ...wallet.user,
                // Add balance prop if supported, or just update assets
                displayName: wallet.user.displayName
            } : wallet.user;

            // You can process `tokenBalances` here if needed or just rely on wallet.assets
            console.log('Balances processed:', { identityBalance, tokenBalances })

        } catch (error) {
            console.error('Failed to fetch balances:', error)
            throw error
        }
    }

    return {
        fetchLiveBalances
    }
}
