<!-- src/screens/Bootstrap.vue -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBootstrap } from '@/composables/useBootstrap'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { useWallet } from '@/composables/useWallet'
import { useTransactions } from '@/composables/useTransactions'
import { SANS_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_TESTNET } from '@/constants'
import QRCodeVue from 'qrcode.vue'
const router = useRouter()
const identityStore = useIdentityStore()
const { network: currentNetwork } = useNetwork()
const {
  isSearching,
  isStaking,
  result,
  error,
  load,
  leaderboard,
  licenseValid,
  fetchLeaderboard,
  checkLicenseStatus,
  setStakingState
} = useBootstrap()
const wallet = useWallet()
const txs = useTransactions()
const clipboard = navigator.clipboard!
// We need the Identity ID to auto-load
const currentIdentityId = computed(() => {
  return identityStore.identity?.identityId || identityStore.identityId
})
const displayAddress = computed(() => {
  return result.value?.dashAddr ? `dash:${result.value.dashAddr}` : ''
})
// Requirement 3: Filter for SANS transfers TO the staking address
const STAKING_ID = '8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE'
const stakingHistory = computed(() => {
  // Ensure we are looking at the correct symbol and receiver
  return txs.transactions.value.filter(tx =>
    tx.assetSymbol === 'SANS' && tx.receiverId === STAKING_ID
  ).sort((a, b) => b.date - a.date) // Sort desc to check latest
})
// Requirement 4: Check License and perform Staking
const handleStaking = async () => {
  if (!result.value) return
  setStakingState(true)
  try {
    // Select correct contract based on network
    const contractId = currentNetwork.value === 'mainnet'
      ? SANS_CONTRACT_ID_MAINNET : SANS_CONTRACT_ID_TESTNET
    // Amount: 500 SANS (Atomic units usually 100,000,000 for 1 token based on Dash Platform standard)
    // Verified via useTransactions that 1 SANS = 10^8 atomic units (implied by DASH parity)
    // If SANS has different decimals, adjust this divisor.
    const amountAtomic = BigInt(500 * 100000000)
    const res = await wallet.sendTokenTransfer(
      result.value.identityId,
      0, // identityIdx (handled internally by composable usually, but 0 is standard for 1st key)
      contractId,
      STAKING_ID,
      amountAtomic
    )
    if (res.success) {
      // Refresh history immediately after broadcast
      if (result.value.identityId) {
        await refreshHistory()
      }
    } else {
      throw new Error(res.error?.message || 'Transaction failed')
    }
  } catch (err: any) {
    console.error("Staking failed", err)
    alert(`Staking Failed: ${err.message}`)
  } finally {
    setStakingState(false)
  }
}
const refreshHistory = async () => {
  if (result.value?.identityId) {
    // Fetch latest transactions
    await txs.fetchIdentityTransfers(result.value.identityId)
    // Recalculate license status
    await checkLicenseStatus(stakingHistory.value)
  }
}
// Auto-load logic
onMounted(async () => {
  // 1. Load Leaderboard (Network agnostic for campaign view)
  await fetchLeaderboard()
  // 2. Load Identity Data
  if (currentIdentityId.value) {
    await load(currentIdentityId.value, currentNetwork.value)
    // 3. Load History & Check License
    await refreshHistory()
  }
})
// Watch for connection changes
watch([currentIdentityId, currentNetwork], ([newId, newNetwork]) => {
  if (newId) {
    load(newId, newNetwork)
  } else {
    // Clear result if disconnected
    result.value = null
    if (!error.value?.includes('Mainnet')) {
        error.value = 'Please connect your wallet to view your contribution address.'
    }
  }
})
</script>
<template>
  <main>
    <!-- Header -->
    <div class="mb-8 md:mb-12">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
        Sansbank Bootstrap Fund
      </h1>
      <p class="text-lg text-slate-500 dark:text-slate-400">
        Stake 500 SANS to activate your platform license.
      </p>
    </div>
    <!-- SECTION: Leaderboard (Requirement 1) -->
    <section class="max-w-5xl mx-auto px-4 mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-slate-900 dark:text-white">Top Contributors</h2>
        <div class="text-sm text-slate-500">Week #2</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="(leader, idx) in leaderboard" :key="leader.platformid"
             class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative">
          <!-- Background decoration -->
          <div class="absolute top-0 right-0 p-4 opacity-10" style="font-size: 5rem;">
            <svg class="w-full h-full fill-current text-cyan-500" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
          </div>
          <div class="relative p-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {{ idx + 1 }}
              </div>
              <div class="overflow-hidden">
                <p class="font-bold text-slate-900 dark:text-white truncate">{{ leader.username || leader.platformid }}</p>
                <p class="text-xs text-slate-500 truncate">{{ leader.platformid }}</p>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p class="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Contribution</p>
              <p class="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                {{ leader.displayBalance }} <span class="text-sm font-normal">SANS</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- SECTION: Main Interface -->
    <section class="max-w-5xl mx-auto px-4">
      <!-- Network Check -->
      <div v-if="currentNetwork === 'testnet'" class="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h3 class="text-xl font-bold text-amber-800 dark:text-amber-400">Mainnet Only</h3>
                <p class="text-amber-700 dark:text-amber-600">Please switch network to Mainnet</p>
            </div>
            <button @click="router.push('/settings')" class="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all">
                Switch Network
            </button>
        </div>
      </div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- Left Column: Contribution & QR -->
        <div v-if="result" class="flex flex-col gap-6">
            <!-- QR Card -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Contribution Address</h3>
                <p class="text-slate-500 mb-8">Send DASH or SANS to {{ result.displayName }}</p>
                <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner inline-flex mb-8 relative group cursor-pointer">
                    <QRCodeVue
                    level="H"
                    />
                    <div class="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span class="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-bold">Scan to Pay</span>
                    </div>
                </div>
                <div class="relative">
                    <input type="text" readonly :value="displayAddress"
                    class="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm p-4 rounded-xl border border-slate-300 dark:border-slate-700 pr-12 text-center">
                    <button @click="clipboard.writeText(displayAddress)" class="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-cyan-500 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                </div>
            </div>
            <!-- Identity Summary Card -->
            <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-4">
                <div class="relative">
                    <img :src="result.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.displayName)}&background=8b5cf6&color=fff`"
                        class="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                </div>
                <div>
                    <h4 class="font-bold text-slate-900 dark:text-white">{{ result.displayName }}</h4>
                    <p class="text-xs font-mono text-slate-500">{{ result.identityId }}</p>
                </div>
            </div>
        </div>
        <!-- Right Column: Asset Balances & Staking -->
        <div v-if="result" class="space-y-6">
            <!-- Requirement 2 & 4: SANS Balance & CTA Card -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl relative">
                <div class="flex justify-between items-start mb-6">
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white">Sansnote (SANS)</h3>
                    <!-- License Status Badge -->
                    <div :class="licenseValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                        class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-opacity-20 border-current">
                        {{ licenseValid ? 'LICENSE ACTIVE' : 'LICENSE REVOKED' }}
                    </div>
                </div>
                <div class="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800">
                    <div>
                        <p class="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Current Balance</p>
                        <p class="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {{ result.balances.sansBalanceDisplay }}
                        </p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 font-bold text-xl">
                        S
                    </div>
                </div>
                <!-- Logic: Under 500 SANS -->
                <div v-if="licenseValid || parseFloat(result.balances.sansBalanceDisplay) < 500" class="space-y-4">
                    <div v-if="!licenseValid" class="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-xl text-sm text-rose-700 dark:text-rose-400 mb-4">
                        <strong>Staking Required:</strong> Your last stake was over 30 days ago. Send 500 SANS to renew your license.
                    </div>
                    <div v-else-if="parseFloat(result.balances.sansBalanceDisplay) < 500" class="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl text-sm text-amber-700 dark:text-amber-400 mb-4">
                        <strong>Balance Low:</strong> You need to stake 500 SANS to participate in the bootstrap fund.
                    </div>
                    <button
                        @click="handleStaking"
                        class="w-full py-4 font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <span v-if="isStaking" class="rounded-full h-4 w-4 border-b-2 border-white border-r-2 border-transparent animate-spin"></span>
                        <span>{{ isStaking ? 'Processing Transaction...' : (licenseValid ? 'Re-Stake (Optional)' : 'Get Staked!') }}</span>
                    </button>
                    <p v-if="!licenseValid" class="text-xs text-center text-slate-500">
                        Sending 500 SANS to {{ STAKING_ID }}
                    </p>
                </div>
                <div v-else class="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 mb-4">
                    <strong>All Clear:</strong> You have staked over 500 SANS recently.
                </div>
            </div>
            <!-- Requirement 3: History Card -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Staking History</h3>
                <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="item in stakingHistory" :key="item.id"
                         class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-cyan-500/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            </div>
                            <div>
                                <p class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                    {{ (item.amount as number / 100000000).toLocaleString() }} SANS
                                </p>
                                <p class="text-[10px] font-mono text-slate-400" :title="item.id">
                                    {{ item.id.substring(0, 16) }}...
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {{ new Date(item.date).toLocaleDateString() }}
                            </p>
                            <p class="text-[10px] text-slate-400">
                                {{ new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                            </p>
                        </div>
                    </div>
                    <div v-if="stakingHistory.length === 0" class="text-center py-12 text-slate-500 text-sm italic">
                        No staking history found for this identity.
                    </div>
                </div>
            </div>
        </div>
        <!-- Empty / Loading States -->
        <div v-else-if="isSearching" class="col-span-1 lg:col-span-2 flex justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
        <div v-else class="col-span-1 lg:col-span-2 text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <p class="text-slate-500">Please connect your wallet to see your status.</p>
        </div>
      </div>
    </section>
  </main>
</template>
