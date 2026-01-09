<!-- src/screens/Bootstrap.vue -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'
import { useBootstrap } from '@/composables/useBootstrap'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import QRCodeVue from 'qrcode.vue'

const router = useRouter()
const identityStore = useIdentityStore()
const { network: currentNetwork } = useNetwork()
const { isSearching, result, error, load } = useBootstrap()

const clipboard = navigator.clipboard!

// We need the Identity ID to auto-load
const currentIdentityId = computed(() => {
  return identityStore.identity?.identityId || identityStore.identityId
})

const displayAddress = computed(() => {
  return result.value?.dashAddr ? `dash:${result.value.dashAddr}` : ''
})

// Auto-load logic
onMounted(() => {
  if (currentIdentityId.value) {
    load(currentIdentityId.value, currentNetwork.value)
  }
})

// Watch for connection changes
watch([currentIdentityId, currentNetwork], ([newId, newNetwork]) => {
  if (newId) {
    load(newId, newNetwork)
  } else {
    // Clear result if disconnected
    result.value = null
    // Clear error unless it's the specific testnet warning handled in UI
    if (!error.value?.includes('Mainnet')) {
        error.value = 'Please connect your wallet to view your contribution address.'
    }
  }
})
</script>

<template>
  <main>
    <Header title="Sansbank Bootstrap Fund" />

    <section class="bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-200 min-h-screen border-2 border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div class="flex flex-col gap-16">

          <!-- Hero Section -->
          <div class="text-center space-y-8">
            <p class="max-w-3xl mx-auto text-2xl font-bold leading-relaxed text-rose-700 dark:text-rose-400">
              A community-powered initiative to launch Sansbank, next-generation permissionless financial tool for Dash ecosystem. Let's build the future, together.
            </p>

            <!-- Progress Bar -->
            <div class="pt-4">
              <div class="flex justify-between mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <span>Funding Goal: 250 DASH</span>
                <span>Raised: 162.5 DASH (65%)</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 border border-slate-200/50 dark:border-slate-600/50">
                <div class="bg-gradient-to-r from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500 h-4 rounded-full shadow-lg" style="width: 65%"></div>
              </div>
            </div>
          </div>

          <!-- "What is Sansbank?" Section -->
          <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              What is Sansbank?
            </h2>
            <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Sansbank is a community-driven project designed to enhance utility and power of Dash network. By providing new, accessible financial tools, we aim to unlock full potential of Dash for users, developers, and Masternode owners alike, creating a more robust and vibrant ecosystem.
            </p>
          </div>

          <!-- Main Content Area -->
          <div class="w-full">

            <!-- NETWORK CHECK: Testnet Warning -->
            <div v-if="currentNetwork === 'testnet'" class="w-full text-center p-8 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm mb-8">
              <div class="flex flex-col items-center gap-4">
                <div class="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>
                </div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Mainnet Only
                </h3>
                <p class="max-w-md text-center text-slate-700 dark:text-slate-300">
                  The Sansbank Bootstrap Fund is live on <span class="font-bold text-cyan-600 dark:text-cyan-400">Mainnet</span>. Please switch your network settings to Mainnet to generate a contribution address.
                </p>
                <button
                  @click="router.push('/settings')"
                  class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
                >
                  Go to Settings
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div v-else-if="isSearching && currentNetwork === 'mainnet'" class="flex flex-col items-center justify-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
              <p class="text-slate-600 dark:text-slate-400 font-medium">Fetching your Dash address...</p>
            </div>

            <!-- Permission State (Not Connected) -->
            <div v-else-if="!currentIdentityId && currentNetwork === 'mainnet'" class="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p class="text-slate-600 dark:text-slate-400 mb-4">
                Please connect your wallet to view your personalized contribution address.
              </p>
              <router-link
                to="/connect"
                class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-cyan-700 transition-all"
              >
                Connect Wallet
              </router-link>
            </div>

            <!-- Error State -->
            <div v-else-if="error && currentNetwork === 'mainnet'" class="max-w-2xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-6 rounded-xl flex items-center gap-4 shadow-sm animate-pulse">
              <svg class="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span class="font-bold">Error:</span>
                <span class="ml-2">{{ error }}</span>
              </div>
            </div>

            <!-- Active Result Card (Auto-loaded) -->
            <div v-else-if="result && currentNetwork === 'mainnet'" class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

              <!-- Left: QR Code & Address -->
              <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl flex flex-col items-center text-center">
                <div class="mb-6 flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-xl">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <h3 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Your Contribution Address
                  </h3>
                </div>
                <p class="text-slate-600 dark:text-slate-400 mb-8">
                  Send Dash to the address below to support <span class="font-bold text-slate-900 dark:text-white">{{ result.displayName }}</span>.
                </p>

                <!-- QR Code -->
                <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 mb-8 relative group">
                  QR Code
                  <div v-if="result.dashAddr">
                    <QRCodeVue
                      :value="'dash:' + result.dashAddr"
                      :size="220"
                      level="H"
                      :margin="2"
                      class="rounded-lg overflow-hidden"
                    />
                    <div class="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg">
                      <span class="bg-black/70 text-white px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide backdrop-blur-sm mt-[70px]">Scan to Pay</span>
                    </div>
                  </div>
                  <div v-else class="w-[220px] h-[220px] flex items-center justify-center text-slate-400">
                    No address found
                  </div>
                </div>

                <!-- Address Input -->
                <div class="w-full max-w-sm">
                  <div class="relative">
                    <input
                      type="text"
                      readonly
                      :value="displayAddress"
                      class="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-center p-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 pr-12 shadow-sm focus:ring-4 focus:ring-cyan-400/30 transition-all text-lg"
                    >
                    <button
                      @click="clipboard.writeText(displayAddress)"
                      class="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      title="Copy Address"
                    >
                      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    </button>
                  </div>
                </div>
                <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  All contributions are secured via InstantSend.
                </p>
              </div>

              <!-- Right: User Profile & Balances -->
              <div class="flex flex-col gap-6">
                <!-- Profile Card -->
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl flex items-center gap-6">
                  <div class="relative">
                    <img
                      :src="result.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.displayName)}&background=8b5cf6&color=fff`"
                      class="w-20 h-20 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 object-cover"
                    />
                    <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>
                  <div class="flex-1 text-left">
                    <h4 class="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                      {{ result.displayName }}
                    </h4>
                    <p class="text-slate-500 dark:text-slate-400 text-sm truncate font-mono">
                      {{ result.identityId }}
                    </p>
                    <p class="text-xs text-slate-400 mt-1">
                      {{ result.bio || 'No bio available.' }}
                    </p>
                  </div>
                </div>

                <!-- Balances Card -->
                <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-xl">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Asset Balances
                  </h3>
                  <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">D</div>
                        <span class="font-medium text-slate-700 dark:text-slate-300">DASH</span>
                      </div>
                      <span class="font-bold text-slate-900 dark:text-slate-100">{{ result.balances.creditsBalanceDisplay }} DASH</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-xs">$</div>
                        <span class="font-medium text-slate-700 dark:text-slate-300">DUSD</span>
                      </div>
                      <span class="font-bold text-slate-900 dark:text-slate-100">{{ result.balances.dusdBalanceDisplay }} DUSD</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold text-xs">S</div>
                        <span class="font-medium text-slate-700 dark:text-slate-300">SANS</span>
                      </div>
                      <span class="font-bold text-slate-900 dark:text-slate-100">{{ result.balances.sansBalanceDisplay }} SANS</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- "Our Commitment" Section -->
          <div class="w-full text-center p-8 border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-xl backdrop-blur-sm">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Our Commitment to the Community
            </h2>
            <p class="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              This is not just a funding round; it's a partnership. We are committed to full transparency and will provide regular updates on our progress. If this proposal is successful, we will submit a formal proposal to the Dash Treasury to secure long-term, sustainable funding, ensuring Sansbank becomes a permanent fixture of the Dash ecosystem.
            </p>
          </div>

        </div>
      </div>
    </section>
  </main>
</template>
