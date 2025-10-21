/* Import modules. */
import getIdentities from './getIdentities'
import getPrivateKeys from './getPrivateKeys'

export default async (
    _currentNetwork: string,
    _identityIdx: number,
) => {
    /* Set network. */
    const network = (_currentNetwork === 'mainnet') ? 'mainnet' : 'testnet'

    /* Request private keys. */
    const generatedkeys = getPrivateKeys(network, _identityIdx)
console.log('GENERATED KEYS', generatedkeys)

// FIXME -- ONLY SEARCH IF (STANDARD) KEYS DO NOT WORK
    const response = await getIdentities(network)
    const registeredKeys = response![0].publicKeys
console.log('REGISTERED KEYS', registeredKeys)
// FIXME WE WANT TO SUPPORT ALTERNATIVE KEY CONFIGURATIONS

/*

PURPOSES
0 => AUTHENTICATION
1 => ENCRYPTION
2 => DECRYPTION
3 => TRANSFER

TYPES
0 =>
1 =>
2 => ???

SECURITY LEVELS
0 => MASTER
1 => CRITICAL
2 => HIGH
3 => MEDIUM



// WHAT IS THE CONFIG FOR TRANSFER KEYS??

const signingPublicKey = regPubKeys.find((_pubkey: any) => {
    return _pubkey.purpose === 0 && (_pubkey.securityLevel === 1 || _pubkey.securityLevel === 2)
})
console.log('SIGNING (public) KEY', signingPublicKey)

const signingPrivateKey = publicKeys.find(_pubkey => {
    return _pubkey.id === signingPublicKey.id
})
console.log('SIGNING (private) KEY', signingPrivateKey)

const seedPrivateKey = signingPrivateKey!.privateKeyWif

*/

    /* Return transfer (private) key (WIF). */
    return generatedkeys.transferKey.private_key_wif
    // return generatedkeys.transferKey.private_key_hex
}
