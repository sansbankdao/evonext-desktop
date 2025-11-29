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
// const KEY_ID = 0

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
    /* Initialize locals. */
    let hdKey
    let privateKey

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

    /* Derive Master Authentication. */
    hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, 0, network)

    /* Derive private key. */
    privateKey = PrivateKeyWASM
        .fromHex(binToHex(hdKey.privateKey), network)
// console.log('\nPRIVATE KEY', privateKey)
// console.log('\nPRIVATE KEY (hex)', privateKey.hex())
// console.log('\nPRIVATE KEY (WIF)', privateKey.WIF())

    /* Set public key. */
    // const publicKey = hdKey.publicKey
// console.log('\nPUBLIC KEY', publicKey)
// console.log('\nPUBLIC KEY (hex)', binToHex(publicKey))
// console.log('\nPUBLIC KEY (hash160)', binToHex(hash160(publicKey)))

    /* Master Authentication */
    // const masterKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/0'`
    const masterKey = privateKey


    /* Derive Critical Authentication. */
    hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, 1, network)

    /* Derive private key. */
    privateKey = PrivateKeyWASM
        .fromHex(binToHex(hdKey.privateKey), network)

    /* Critical Authentication */
    // const authCriticalPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/1'`
    const authCritical = privateKey


    /* Derive Critical Authentication. */
    hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, 2, network)

    /* Derive private key. */
    privateKey = PrivateKeyWASM
        .fromHex(binToHex(hdKey.privateKey), network)

    /* High Authentication */
    // const authHighPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/2'`
    const authHigh = privateKey


    /* Derive Critical Authentication. */
    hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, 3, network)

    /* Derive private key. */
    privateKey = PrivateKeyWASM
        .fromHex(binToHex(hdKey.privateKey), network)

    /* Transfer Key */
    // const transferKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/3'`
    const transferKey = privateKey


    /* Derive Critical Authentication. */
    hdKey = sdk.keyPair.deriveIdentityPrivateKey(
        walletHDKey, IDENTITY_INDEX, 4, network)

    /* Derive private key. */
    privateKey = PrivateKeyWASM
        .fromHex(binToHex(hdKey.privateKey), network)

    /* Authentication Key */
    // const encryptionKeyPath = `m/9'/${network === 'mainnet' ? 5 : 1}'/5'/0'/0'/${_identityIdx}'/4'`
    const encryptionKey = privateKey

    /* Return ALL keys. */
    return {
        masterKey,
        authCritical,
        authHigh,
        transferKey,
        encryptionKey,
    }
}
