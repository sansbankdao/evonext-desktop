<!-- src/screens/Identity/AddKey.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// import Header from '@/components/Header.vue'
// import AddKeyIdentityList from '@/components/addKey/IdentityList.vue'
// import AddKeyIdentityDetail from '@/components/addKey/IdentityDetail.vue'
// import AddKeyKeyForm from '@/components/addKey/KeyForm.vue'
import { useKeyUtils } from '@/composables/useKeyUtils'
import { useKeyManagement } from '@/composables/useKeyManagement'
import { mnemonicManager } from '@/composables/useMnemonic'
import { identityDiscovery } from '@/composables/useIdentityDiscovery'
import type { IdentityWithKeys, IIdentity } from '@/types'

const router = useRouter()
const { hasTransferKey: checkTransferKey } = useKeyUtils()
const { addTransferKey: addKeyToIdentity } = useKeyManagement()

// State
const loading = ref(true)
const identities = ref<IdentityWithKeys[]>([])
const selectedIdentity = ref<IdentityWithKeys | null>(null)

const keyType = ref<'ECDSA_SECP256K1' | 'ECDSA_HASH160'>('ECDSA_SECP256K1')
const securityLevel = ref<'MASTER' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL')
const confirmed = ref(false)
const isAdding = ref(false)

// Computed form state for v-model
const formState = computed(() => ({
    keyType: keyType.value,
    securityLevel: securityLevel.value,
    confirmed: confirmed.value
}))

// Parse security level to number
const parseSecurityLevel = (level: string): 0 | 1 | 2 | 3 | 4 => {
    switch(level) {
        case 'MASTER': return 0
        case 'CRITICAL': return 1
        case 'HIGH': return 2
        case 'MEDIUM': return 3
        case 'LOW': return 4
        default: return 1
    }
}

// Load identities
const loadIdentities = async () => {
    try {
        loading.value = true
        const mnemonic = await mnemonicManager.getMnemonic()

        if (!mnemonic) {
            identities.value = []
            showNotification('warning', 'No mnemonic found.')
            return
        }

        const result = await identityDiscovery.getIdentitiesFromSeed(mnemonic, {
            minIndexSearch: 5,
            queryRegistry: true
        })

        if (result && Array.isArray(result) && result.length > 0) {
            // FIX: Ensure publicKeys is always present, handling type mismatches
            identities.value = result.map((identity: any): IdentityWithKeys => {
                const pk = identity.publicKeys || []
                // Handle potential number revision if returned, map to bigint
                const rev = typeof identity.revision === 'number'
                    ? BigInt(identity.revision)
                    : (identity.revision || BigInt(0))

                return {
                    id: identity.id || identity.identityId || '',
                    identityIdx: identity.identityIdx || 0,
                    revision: rev,
                    username: identity.username || identity.dpnsUsername || '',
                    displayName: identity.displayName || identity.dpnsUsername || '',
                    publicKeys: pk
                }
            })

            const missingTransfer = identities.value.find(i => !checkTransferKey(i.publicKeys))
            selectedIdentity.value = missingTransfer || identities.value[0] || null
        } else {
            identities.value = []
        }
    } catch (error) {
        console.error('Failed to load identities:', error)
        showNotification('error', 'Failed to load identities')
        identities.value = []
    } finally {
        loading.value = false
    }
}

const setSelectedIdentity = (identity: IdentityWithKeys) => {
    selectedIdentity.value = identity
}

const hasTransferKey = (identity: IdentityWithKeys): boolean => {
    return checkTransferKey(identity.publicKeys)
}

const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const event = new CustomEvent('notification', { detail: { type, message, duration: 3000 } })
    window.dispatchEvent(event)
}

const addTransferKey = async () => {
    if (!selectedIdentity.value || !confirmed.value) {
        showNotification('error', 'Please select an identity and confirm')
        return
    }

    try {
        isAdding.value = true
        const identity = selectedIdentity.value

        const result = await addKeyToIdentity(
            identity.id || '',
            identity.identityIdx,
            identity.revision || BigInt(0),
            (identity.publicKeys || []),
            keyType.value
        )

        if (result.success) {
            showNotification('success', 'TRANSFER key added!')
            await loadIdentities()
            setTimeout(() => router.push('/identity'), 1500)
        } else {
            showNotification('error', result.error || 'Failed')
        }
    } catch (error: any) {
        console.error(error)
        showNotification('error', error.message || 'Failed')
    } finally {
        isAdding.value = false
    }
}

onMounted(loadIdentities)
</script>
