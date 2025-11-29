// src/libs/getPrivateKeys.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'

import getMnemonic from './getMnemonic'
import getNetwork from './getNetwork'

const IDENTITY_INDEX = 0
const KEY_ID = 0

/* Get Private Keys. */
export default async (
    _identityIdx: number,
    _queryRegistry: boolean,
) => {
    /* Request mnemonic. */
    const mnemonic = await getMnemonic()

    /* Request network. */
    const network = await getNetwork()

    /* Initialize SDK. */
    const sdk = new DashPlatformSDK({ network })

const seed = await sdk.keyPair.mnemonicToSeed(mnemonic, undefined)
console.log('\nSEED', seed)

const walletHDKey = sdk.keyPair.seedToHdKey(seed)
console.log('\nWALLET HD KEY', walletHDKey)

const hdKey = sdk.keyPair.deriveIdentityPrivateKey(walletHDKey, IDENTITY_INDEX, KEY_ID, 'mainnet')
console.log('\n HD KEY', hdKey)

const privateKey = hdKey.privateKey
console.log('\nPRIVATE KEY', privateKey)

const publicKey = hdKey.publicKey
console.log('\nPUBLIC KEY', publicKey)
console.log('\nPUBLIC KEY (hex)', binToHex(publicKey))
console.log('\nPUBLIC KEY (hash160)', binToHex(hash160(publicKey)))


    /* Master Authentication */
    const masterKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/0'`
    const masterKey = derive_key_from_seed_with_path(
        mnemonic!, undefined, masterKeyPath, _currentNetwork)
    // console.log('Master key object:', masterKey)
    // console.log('Master key (public_key):', masterKey.public_key)

    /* Critical Authentication */
    const authCriticalPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/1'`
    const authCritical = derive_key_from_seed_with_path(
        mnemonic!, undefined, authCriticalPath, _currentNetwork)

    /* High Authentication */
    const authHighPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/2'`
    const authHigh = derive_key_from_seed_with_path(
        mnemonic!, undefined, authHighPath, _currentNetwork)

    /* Transfer Key */
    const transferKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/3'`
    const transferKey = derive_key_from_seed_with_path(
        mnemonic!, undefined, transferKeyPath, _currentNetwork)

    /* Authentication Key */
    const encryptionKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/4'`
    const encryptionKey = derive_key_from_seed_with_path(
        mnemonic!, undefined, encryptionKeyPath, _currentNetwork)

    /* Return ALL keys. */
    return {
        masterKey,
        authCritical,
        authHigh,
        transferKey,
        encryptionKey,
    }
}
