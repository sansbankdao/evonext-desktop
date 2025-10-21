/* Import modules. */
import getPrivateKeys from './getPrivateKeys'

export default async (
    _currentNetwork: string,
    _identityIdx: number,
) => {
    /* Request private keys. */
    const keys = await getPrivateKeys(_currentNetwork, _identityIdx)

    /* EvoNext (default) key setup. */
    const publicKeys = [
        {
            id: 0,
            keyType: 'ECDSA_HASH160',
            purpose: 'AUTHENTICATION',
            securityLevel: 'MASTER',
            privateKeyHex: keys.masterKey.private_key_hex,
            privateKeyWif: keys.masterKey.private_key_wif,
            readOnly: false
        },
        {
            id: 1,
            keyType: 'ECDSA_HASH160',
            purpose: 'AUTHENTICATION',
            securityLevel: 'CRITICAL',
            privateKeyHex: keys.authCritical.private_key_hex,
            privateKeyWif: keys.authCritical.private_key_wif,
            readOnly: false
        },
        {
            id: 2,
            keyType: 'ECDSA_HASH160',
            purpose: 'AUTHENTICATION',
            securityLevel: 'HIGH',
            privateKeyHex: keys.authHigh.private_key_hex,
            privateKeyWif: keys.authHigh.private_key_wif,
            readOnly: false
        },
        {
            id: 3,
            keyType: 'ECDSA_HASH160',
            purpose: 'TRANSFER',
            securityLevel: 'CRITICAL',
            privateKeyHex: keys.transferKey.private_key_hex,
            privateKeyWif: keys.transferKey.private_key_wif,
            readOnly: false
        },
        {
            id: 4,
            keyType: 'ECDSA_SECP256K1',
            purpose: 'ENCRYPTION',
            securityLevel: 'MEDIUM',
            privateKeyHex: keys.encryptionKey.private_key_hex,
            privateKeyWif: keys.encryptionKey.private_key_wif,
            readOnly: false
        },
    ]

    /* Return ALL public keys. */
    return publicKeys
}
