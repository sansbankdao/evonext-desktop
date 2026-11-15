// src/lib/identity-manager.ts
//
// Desktop port boundary (evonext-desktop). The web identity-manager
// implements seed-index discovery on top of its nexajs crypto helpers and
// the full service barrel. The desktop already ships discovery:
//   src/services/identity/discovery/SeedDiscovery.ts  (HD path scan)
//   src/services/identity/discovery/KeyDiscovery.ts   (WIF/public-key-hash)
// so this module exposes ONLY the member the ported wallet layer consumes
// (lib/wallet-manager.ts getAuthKey/getTransferKey -> getIdentities) and
// fails LOUDLY if reached unmocked — the wiring to the desktop discovery
// happens in the wallet UI integration phase. The token-send/token-facts
// KAT suites mock this module (importOriginal keeps this stub's shape).

export interface IIdentityLike {
    id: string
    idx: number
    publicKeys: Array<{
        id: number
        type?: string
        keyType?: string
        purpose: string | number
        securityLevel: string | number
        contractBounds?: unknown
        data: string
        dataBytes?: string
        readOnly?: boolean
        disabledAt?: boolean | number | null
    }>
}

/** Seed-index scan — NOT WIRED on desktop yet (see header). */
export const getIdentities = async (_network: string): Promise<IIdentityLike[] | null> => {
    throw new Error(
        'identity-manager.getIdentities is not wired on desktop: use the desktop discovery '
        + '(src/services/identity/discovery) or mock this module in tests (web parity: '
        + 'evonext.app lib/identity-manager.ts).',
    )
}
