// src/services/identity/index.ts

export {
    KeyDerivationService,
    detectKeyFormat,
    deriveAllPossibleHashes,
    deriveAllKeysFromSeed,
    derivePrivateKeyFromWIF,
    getPrivateKeyWASM,
} from './keyDerivation.service'
export { DAPIService } from './discovery/DAPIService'
export { KeyDiscovery } from './discovery/KeyDiscovery'
export { SeedDiscovery, type ProgressCallback, type SeedDiscoveryOptions } from './discovery/SeedDiscovery'
export { type ScanProgress } from './types'
export {
    IdentityManager,
    getIdentityManager,
} from './discovery/IdentityManager'
export * from './types'
