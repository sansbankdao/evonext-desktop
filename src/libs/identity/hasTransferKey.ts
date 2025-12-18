// src/libs/identity/hasTransferKey.ts
import { useIdentityStore } from '@/stores/identity'
export default function hasTransferKey(): boolean {
    const identityStore = useIdentityStore()
    const storedIdentity = identityStore.currentIdentity
    if (!storedIdentity?.public_keys?.length) return false
    return storedIdentity.public_keys.some(key => key.purpose === 1)
}
