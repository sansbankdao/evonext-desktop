// src/libs/getTokenBalances.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import getNetwork from './getNetwork'

interface TokenBalance {
    tokenId: {
        base58: () => string
    }
    balance: bigint
}

/* Initialize constants. */
const DUSD_CONTRACT_ID = 'DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd'
const SANS_CONTRACT_ID = 'AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB'
const TDUSD_CONTRACT_ID = '3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz'
const TSANS_CONTRACT_ID = 'A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN19UqUfM1kw'

export default async (
    identityId: string,
    _tokenIds: string[],
): Promise<TokenBalance[]> => {
    /* Initialize locals. */
    let tokenIds: string[]

    /* Request network. */
    const network = await getNetwork()

    /* Initialize SDK. */
    const sdk = new DashPlatformSDK({ network })

    /* Validate token IDs. */
    if (typeof _tokenIds === 'undefined' || _tokenIds === null) {
        /* Validate network. */
        if (network === 'mainnet') {
            /* Set (mainnet) token IDs. */
            tokenIds = [DUSD_CONTRACT_ID, SANS_CONTRACT_ID]
        } else {
            /* Set (testnet) token IDs. */
            tokenIds = [TDUSD_CONTRACT_ID, TSANS_CONTRACT_ID]
        }
    } else {
        tokenIds = _tokenIds
    }

    /* Request token balances. */
    const tokensIdentityBalance = await sdk.tokens
        .getIdentityTokensBalances(identityId, tokenIds)
console.log('TOKEN BALANCE', tokensIdentityBalance)
tokensIdentityBalance.forEach((_token, _index) => {
    console.log(`TOKEN #${_index}`,
        tokensIdentityBalance[_index].tokenId.base58(),
        tokensIdentityBalance[_index].balance)
})

    /* Handle balances. */
    const tokenBalances: TokenBalance[] = tokensIdentityBalance.map(_token => ({
        tokenId: _token.tokenId,
        balance: _token.balance ? BigInt(_token.balance) : BigInt(0)
    }))

    /* Return (token) balances. */
    return tokenBalances
}
