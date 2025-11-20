// src/libs/getIdentityBalance.ts
/* Initialize Web API endpoint. */
const WEB_API_ENDPOINT = 'https://dashqt.org/v1/dapi'

/**
 * Web API Query
 *
 * Wrapper for DAPI web service calls.
 */
const queryWebAPI = async (_method: string, _params: any[]): Promise<any> => {
    try {
        const response = await fetch(WEB_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: _method,
                params: _params,
            }),
        })
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json()
        return result
    } catch (error) {
        console.error(`Web API query failed for ${_method}:`, error)
        return null
    }
}

/**
 * Get Identity Balance
 *
 * Queries the Web API for the balance of the given identity.
 */
export default async (identityId: string): Promise<string | null> => {
    const result = await queryWebAPI('get_identity_balance', [identityId])
    if (result && typeof result === 'object' && result.balance) {
        return result.balance
    }
    return null
}
