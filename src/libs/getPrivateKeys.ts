// src/libs/getPrivateKeys.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'pshenmic-dpp'
// @ts-ignore
import { hash160 } from '@evonext/crypto'
// @ts-ignore
import { binToHex, hexToBin } from '@evonext/utils'

import getMnemonic from './getMnemonic'
import getNetwork from './getNetwork'

const IDENTITY_INDEX = 0
const KEY_ID = 0

/**
 * Derivation Paths
 *
 * MAINNET -> m/9'/5'/5'/0'/0'/<IDENTITY_IDX>'/<KEY_IDX>'
 * TESTNET -> m/9'/1'/5'/0'/0'/<IDENTITY_IDX>'/<KEY_IDX>'
 */

/* Get Private Keys. */
export default async (
    _identityIdx: number,
    _queryRegistry: boolean,
) => {
    /* Request mnemonic. */
    const mnemonic = await getMnemonic()

    /* Request network. */
    const network = await getNetwork()
console.log('THE NETWORK IS CURRENTLY', network)

    /* Initialize SDK. */
    const sdk = new DashPlatformSDK({ network })

    /* Set seed. */
    const seed = await sdk.keyPair.mnemonicToSeed(mnemonic, undefined)

    /* Set wallet HD key. */
    const walletHDKey = sdk.keyPair.seedToHdKey(seed)

    /* Derive HD key. */
    const hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, KEY_ID, network)
console.log('\n HD KEY', hdKey)

const privateKey = hdKey.privateKey
console.log('\nPRIVATE KEY', privateKey)
console.log('\nPRIVATE KEY (hex)', binToHex(privateKey))
const pkAlt = PrivateKeyWASM.fromHex(binToHex(privateKey), network)
console.log('\nPRIVATE KEY (ALT)', pkAlt)
console.log('\nPRIVATE KEY (WIF)', pkAlt.WIF())
console.log('\nPRIVATE KEY (HEX)', pkAlt.hex())

const publicKey = hdKey.publicKey
console.log('\nPUBLIC KEY', publicKey)
console.log('\nPUBLIC KEY (hex)', binToHex(publicKey))
console.log('\nPUBLIC KEY (hash160)', binToHex(hash160(publicKey)))


    /* Master Authentication */
    // const masterKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/0'`
    const masterKey = binToHex(privateKey)

    /* Critical Authentication */
    // const authCriticalPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/1'`
    // const authCritical = derive_key_from_seed_with_path(
    //     mnemonic!, undefined, authCriticalPath, network)
    const authCritical = ''

    /* High Authentication */
    // const authHighPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/2'`
    // const authHigh = derive_key_from_seed_with_path(
    //     mnemonic!, undefined, authHighPath, network)
    const authHigh = ''

    /* Transfer Key */
    // const transferKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/3'`
    // const transferKey = derive_key_from_seed_with_path(
    //     mnemonic!, undefined, transferKeyPath, network)
    const transferKey = ''

    /* Authentication Key */
    // const encryptionKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/4'`
    // const encryptionKey = derive_key_from_seed_with_path(
    //     mnemonic!, undefined, encryptionKeyPath, network)
    const encryptionKey = ''

    /* Return ALL keys. */
    return {
        masterKey,
        authCritical,
        authHigh,
        transferKey,
        encryptionKey,
    }
}
