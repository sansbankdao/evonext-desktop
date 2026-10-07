<!-- src/screens/Asset.vue -->
<template>
    <main class="min-h-screen bg-surface-raise bg-surface-base pb-12">
        <Header title="Asset Manager" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <!-- Asset Hero Summary -->
            <section class="mb-8">
                <div class="bg-surface-card p-8 rounded-[2rem] border border-edge shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div class="flex items-center gap-6">
                        <div class="w-20 h-20 rounded-card bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-cyan-500/20">
                            {{ assetMetadata.symbol[0] }}
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-3xl font-black text-content">{{ assetMetadata.name }}</h1>
                                <span class="px-2 py-0.5 rounded-md bg-surface-raise text-content-soft text-[10px] font-black uppercase tracking-widest border border-edge">
                                    {{ assetMetadata.symbol }}
                                </span>
                            </div>
                            <p class="text-content-soft font-mono text-xs mt-1">{{ assetMetadata.contractId }}</p>
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <div class="text-center px-6 border-x border-edge ">
                            <p class="text-[10px] font-black text-content-faint uppercase tracking-widest mb-1">Status</p>
                            <div class="flex items-center gap-2 justify-center">
                                <div class="w-2 h-2 rounded-full" :class="assetMetadata.isPaused ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                                <span class="text-sm font-bold text-content capitalize">{{ assetMetadata.isPaused ? 'Paused' : 'Active' }}</span>
                            </div>
                        </div>
                        <div class="text-center px-6">
                            <p class="text-[10px] font-black text-content-faint uppercase tracking-widest mb-1">Supporters</p>
                            <p class="text-sm font-bold text-content">1,248</p>
                        </div>
                    </div>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Navigation Sidebar -->
                <aside class="lg:col-span-1 space-y-2">
                    <button
                        v-for="tab in tabs"
                        :key="tab.id"
                        @click="activeTab = tab.id"
                        :class="[
                            'w-full flex items-center gap-3 px-6 py-4 rounded-inner font-bold text-sm transition-all',
                            activeTab === tab.id
                                ? 'bg-surface-card dark:bg-surface-card text-white dark:text-content shadow-lg'
                                : 'text-content-soft hover:bg-surface-card dark:hover:bg-surface-card hover:text-brand'
                        ]"
                    >
                        <span class="uppercase tracking-widest">{{ tab.label }}</span>
                    </button>
                </aside>

                <!-- Management Content -->
                <div class="lg:col-span-3 space-y-6">

                    <!-- Tab: Supply & Minting -->
                    <div v-if="activeTab === 'supply'" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-surface-card p-6 rounded-card border border-edge">
                                <h3 class="text-xs font-black text-content-faint uppercase tracking-widest mb-4">Supply Distribution</h3>
                                <div class="space-y-4">
                                    <div>
                                        <div class="flex justify-between text-xs font-bold mb-2">
                                            <span class="text-content-soft">Circulating Supply</span>
                                            <span class="text-content">{{ formatNumber(assetMetadata.circulatingSupply) }}</span>
                                        </div>
                                        <div class="h-2 w-full bg-surface-raise rounded-full overflow-hidden">
                                            <div class="h-full bg-cyan-500" :style="{ width: supplyPercentage + '%' }"></div>
                                        </div>
                                        <p class="text-[10px] text-content-faint mt-2 font-medium">Max Supply: {{ assetMetadata.maxSupply || 'Unlimited' }}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-emerald-600 p-6 rounded-card text-white shadow-xl shadow-emerald-900/10">
                                <h3 class="text-xs font-black text-emerald-200 uppercase tracking-widest mb-4">Mint New Tokens</h3>
                                <div class="space-y-4">
                                    <input
                                        v-model="mintAmount"
                                        type="number"
                                        placeholder="0.00"
                                        class="w-full bg-surface-card/10 border border-white/20 rounded-control px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                                    />
                                    <button @click="handleMint" class="w-full py-3 bg-surface-card text-emerald-600 rounded-control font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors">
                                        Execute Mint
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Governance / Groups -->
                    <div v-if="activeTab === 'governance'" class="bg-surface-card rounded-card border border-edge overflow-hidden">
                        <div class="p-6 border-b border-edge  flex justify-between items-center">
                            <h3 class="text-sm font-black text-content uppercase tracking-tight">Control Groups</h3>
                            <button class="text-xs font-bold text-brand uppercase tracking-widest">+ Add Group</button>
                        </div>
                        <div class="divide-y divide-edge dark:divide-edge">
                            <div v-for="group in assetMetadata.groups" :key="group.name" class="p-6">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 class="font-black text-content uppercase">{{ group.name }}</h4>
                                        <p class="text-xs text-content-soft font-bold">Threshold: {{ group.threshold }} units</p>
                                    </div>
                                    <button class="text-xs font-bold text-content-faint hover:text-red-500 uppercase">Edit</button>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div v-for="member in group.members" :key="member.identity" class="flex items-center justify-between p-3 rounded-control bg-surface-raise bg-surface-card/50 border border-edge ">
                                        <span class="text-xs font-mono text-content-soft truncate max-w-[150px]">{{ member.identity }}</span>
                                        <span class="text-[10px] font-black bg-surface-raise px-2 py-1 rounded text-content-soft">Pwr: {{ member.power }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Distribution -->
                    <div v-if="activeTab === 'distribution'" class="space-y-6">
                        <div class="bg-surface-card p-8 rounded-card border border-edge shadow-sm relative">
                            <div class="flex items-center gap-4 mb-6">
                                <div class="p-3 rounded-inner bg-sky-100 dark:bg-sky-900/30 text-sky-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h3 class="text-sm font-black text-content uppercase tracking-tight">Active Schedule</h3>
                                    <p class="text-xs font-bold text-content-faint uppercase">{{ assetMetadata.distribution.method }} releases</p>
                                </div>
                            </div>

                            <div v-if="assetMetadata.distribution.method === 'programmed'" class="overflow-hidden rounded-inner border border-edge ">
                                <table class="w-full text-left bg-surface-raise/50 bg-surface-card/30">
                                    <thead>
                                        <tr class="text-[10px] font-black text-content-faint uppercase tracking-widest border-b border-edge ">
                                            <th class="px-6 py-3">Release Date</th>
                                            <th class="px-6 py-3">Amount</th>
                                            <th class="px-6 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-edge dark:divide-edge text-xs">
                                        <tr v-for="(release, idx) in assetMetadata.distribution.programmed" :key="idx" class="text-content">
                                            <td class="px-6 py-4 font-bold">{{ new Date(release.timestamp).toLocaleString() }}</td>
                                            <td class="px-6 py-4 font-black">{{ formatNumber(release.amount) }} {{ assetMetadata.symbol }}</td>
                                            <td class="px-6 py-4 text-right">
                                                <button class="text-brand font-bold hover:underline">Cancel</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Header from '@/components/Header.vue'

/**
 * Tab Navigation
 */
const activeTab = ref('supply')
const tabs = [
    { id: 'supply', label: 'Supply & Minting' },
    { id: 'governance', label: 'Control Groups' },
    { id: 'distribution', label: 'Distribution' },
    { id: 'settings', label: 'Token Settings' }
]

/**
 * Mock Data (Typically fetched via contractId in route)
 */
const assetMetadata = ref({
    contractId: 'dc:4f8a9e2b1c7d6e5a4b3f2',
    name: 'Maison Genesis',
    symbol: 'MAISON',
    circulatingSupply: 450000,
    maxSupply: 1000000,
    isPaused: false,
    groups: [
        {
            name: 'Admins',
            threshold: 2,
            members: [
                { identity: 'did:dash:alice...', power: 1 },
                { identity: 'did:dash:bob...', power: 1 },
                { identity: 'did:dash:charlie...', power: 1 }
            ]
        }
    ],
    distribution: {
        method: 'programmed',
        programmed: [
            { timestamp: '2025-06-01T12:00:00Z', amount: 50000 },
            { timestamp: '2026-01-01T12:00:00Z', amount: 100000 }
        ]
    }
})

const mintAmount = ref(0)
const supplyPercentage = computed(() => {
    if (!assetMetadata.value.maxSupply) return 100
    return (assetMetadata.value.circulatingSupply / assetMetadata.value.maxSupply) * 100
})

const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val)
}

const handleMint = async () => {
    if (mintAmount.value <= 0) return
    console.log('[AssetManager] Minting', mintAmount.value)
    // Implement Tauri/Platform invoke here
    alert(`Requesting mint of ${mintAmount.value} ${assetMetadata.value.symbol}...`)
}

onMounted(async () => {
    // Fetch live asset data from the platform using the contractId
})
</script>
