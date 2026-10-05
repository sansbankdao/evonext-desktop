// src/services/nativeDapi.ts

// Tier-2 transport: NATIVE DAPI network access via the bundled DCG SDK
// (direct masternode queries). Tier 1 is the Sansbank DAPI proxy
// (dapi.sankbank.dev/v1/dapi), a single point of failure — when it is
// unreachable (connection error / 5xx), these helpers run the SAME query
// directly against the DAPI network so the app keeps working.
//
// Response envelopes mirror the proxy's raw JSON so callers can treat
// both transports identically:
//   document family  -> { success: true, result: doc[] }
//   get_document     -> { success: true, result: doc | null }
//   identity_fetch   -> { success, result: identity | null } with `id`
//                       aliased as `identityId` (useBootstrap contract)
//   balances         -> { success: true, result: { balance: "..." } }
//
// Methods without a native translation throw a clear error — callers
// must keep their existing degradation behaviour for those.

import { connectEvoSdk } from '@/services/platform'

export interface DapiEnvelope {
    success: boolean
    result: unknown
}

function rawJson(doc: unknown): unknown {
    const withToJSON = doc as { toJSON?: () => unknown } | null
    return typeof withToJSON?.toJSON === 'function' ? withToJSON.toJSON() : doc
}

/** Where/orderBy clauses arrive either as arrays or as JSON strings
 * (the fetching.ts wire shape passes stringified clauses). */
function parseClause(clause: unknown): unknown {
    if (typeof clause === 'string') {
        try {
            return JSON.parse(clause)
        } catch {
            return clause
        }
    }
    return clause
}

async function nativeDocumentQuery(
    network: string,
    dataContractId: unknown,
    documentTypeName: unknown,
    whereClause: unknown,
    orderBy: unknown,
    limit: unknown
): Promise<unknown[]> {
    const sdk = await connectEvoSdk(network)
    const args: Record<string, unknown> = {
        dataContractId,
        documentTypeName,
        where: parseClause(whereClause),
        limit: typeof limit === 'number' ? limit : 100
    }
    const order = parseClause(orderBy)
    if (order) args.orderBy = order
    const res = await sdk.documents.query(args as never)
    const docs =
        res instanceof Map ? Array.from(res.values()) : Array.isArray(res) ? res : []
    return docs.map(rawJson)
}

/**
 * Run one DAPI-proxy-shaped request against the native DAPI network.
 * `params` uses the positional order of the proxy wire contract
 * (see Rust `shape_params_for_wire` / `MethodParamInfo`).
 */
export async function nativeDapiRequest(
    method: string,
    params: unknown[],
    network: string
): Promise<DapiEnvelope> {
    switch (method) {
        case 'get_documents': {
            const [dataContractId, documentType, whereClause, orderBy, limit] = params
            const docs = await nativeDocumentQuery(
                network, dataContractId, documentType, whereClause, orderBy, limit
            )
            return { success: true, result: docs }
        }
        case 'get_document': {
            const [dataContractId, documentType, documentId] = params
            const docs = await nativeDocumentQuery(
                network, dataContractId, documentType,
                [['$id', '==', documentId]], null, 1
            )
            return { success: true, result: docs[0] ?? null }
        }
        case 'identity_fetch': {
            const sdk = await connectEvoSdk(network)
            const identity = await sdk.identities.fetch(params[0] as never)
            if (!identity) return { success: false, result: null }
            const json = rawJson(identity) as Record<string, unknown>
            const id = (json.id ?? json.$id) as string | undefined
            return { success: true, result: { ...json, identityId: id } }
        }
        case 'get_identity_balance': {
            const sdk = await connectEvoSdk(network)
            const balance = await sdk.identities.balance(params[0] as never)
            return { success: true, result: { balance: balance === undefined ? '0' : balance.toString() } }
        }
        case 'get_identity_token_balances': {
            const sdk = await connectEvoSdk(network)
            const [identityId, tokenIds] = params
            const map = await sdk.identities.tokenBalances(
                identityId as never, (tokenIds as string[]) ?? []
            )
            const result = Array.from(map.entries()).map(([tokenId, balance]) => ({
                tokenId,
                balance: balance.toString()
            }))
            return { success: true, result }
        }
        default:
            throw new Error(
                `nativeDapi: method "${method}" has no native fallback translation`
            )
    }
}
