<!-- src/components/addKey/IdentityList.vue -->
<template>
    <div class="space-y-4">
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Select Identity
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="identity in identities" :key="identity.identityId"
                @click="$emit('select-identity', identity)"
                class="relative rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                :class="selectedIdentity?.identityId === identity.identityId
                    ? 'border-cyan-500 bg-gradient-to-br from-cyan-500/5 to-cyan-600/5 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
            >
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0">
                        <div class="size-12 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold">
                            {{ getIdentityInitial(identity) }}
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {{ getIdentityDisplayName(identity) }}
                        </h3>
                        <p class="text-sm text-slate-600 dark:text-slate-400 truncate">
                            {{ identity.username || identity.identityId?.slice(0, 16) + '...' }}
                        </p>
                        <div class="mt-2 flex flex-wrap gap-1">
                            <span v-for="(key, index) in limitedKeys(identity.publicKeys)" :key="index"
                                  class="text-xs px-2 py-1 rounded-full">
                                {{ getKeyTypeShort(key) }}
                            </span>
                            <span v-if="hasMoreKeys(identity.publicKeys)"
                                  class="text-xs text-slate-500 dark:text-slate-400">
                                +{{ getAdditionalKeysCount(identity.publicKeys) }} more
                            </span>
                        </div>
                    </div>
                    <div v-if="selectedIdentity?.identityId === identity.identityId" class="flex-shrink-0">
                        <div class="size-6 rounded-full bg-cyan-500 flex items-center justify-center">
                            <svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import type { IIdentity, IPublicKey } from '@/types'
defineProps<{
    identities: IIdentity[]
    selectedIdentity?: IIdentity | null
    showMissingWarning?: boolean
}>()
defineEmits<{
    'select-identity': [identity: IIdentity]
}>()
const getIdentityInitial = (identity: IIdentity): string => {
    const name = identity.displayName || identity.username || 'ID'
    return name.charAt(0).toUpperCase()
}
const getIdentityDisplayName = (identity: IIdentity): string => {
    if (identity.displayName) return identity.displayName
    if (identity.username) return identity.username.split('.')[0] || 'Unnamed Identity'
    return 'Unnamed Identity'
}
const getKeyBadgeClass = (key: IPublicKey): string => {
    const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
    if (purpose === 1 || purpose === 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (purpose === 0) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (purpose === 2) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}
const getKeyTypeShort = (key: IPublicKey): string => {
    const purpose = typeof key.purpose === 'string' ? parseInt(key.purpose) : key.purpose
    if (purpose === 1 || purpose === 3) return 'TRANSFER'
    if (purpose === 0) return 'AUTH'
    if (purpose === 2) return 'ENCRYPT'
    return 'KEY'
}
const limitedKeys = (keys?: IPublicKey[]): IPublicKey[] => {
    if (!keys) return []
    return keys.slice(0, 3)
}
const hasMoreKeys = (keys?: IPublicKey[]): boolean => {
    return (keys?.length || 0) > 3
}
const getAdditionalKeysCount = (keys?: IPublicKey[]): number => {
    return (keys?.length || 0) - 3
}
</script>
