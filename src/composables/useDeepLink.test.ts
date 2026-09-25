// src/composables/useDeepLink.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest'

const onOpenUrlMock = vi.fn()
const getCurrentMock = vi.fn()

vi.mock('@tauri-apps/plugin-deep-link', () => ({
    onOpenUrl: (...args: unknown[]) => onOpenUrlMock(...args),
    getCurrent: () => getCurrentMock(),
}))

import { parseDashUri, useDeepLink } from './useDeepLink'

/**
 * These tests cover the URI parser and the routing decision.
 *
 * The parser is the part with real branching: `dash:ADDR` and `dash://ADDR`
 * put the address in DIFFERENT fields of the WHATWG URL object. Getting this
 * wrong produces an empty recipient field, which looks like a UI bug rather
 * than a parse bug.
 */
describe('parseDashUri', () => {
    it('parses an opaque dash URI (no slashes)', () => {
        const result = parseDashUri('dash:8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')

        expect(result).not.toBeNull()
        expect(result!.address).toBe('8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')
        expect(result!.amount).toBeNull()
    })

    it('parses an opaque dash URI with an amount', () => {
        const result = parseDashUri(
            'dash:8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE?amount=0.1'
        )

        expect(result).not.toBeNull()
        expect(result!.address).toBe('8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')
        expect(result!.amount).toBe(0.1)
    })

    it('parses an authority-form dash URI (address lands in hostname)', () => {
        // The address is in `hostname`, NOT `pathname`, for this form.
        const result = parseDashUri('dash://8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')

        expect(result).not.toBeNull()
        expect(result!.address).toBe('8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')
    })

    it('parses an authority-form dash URI with an amount', () => {
        const result = parseDashUri(
            'dash://8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE?amount=1.5'
        )

        expect(result).not.toBeNull()
        expect(result!.address).toBe('8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE')
        expect(result!.amount).toBe(1.5)
    })

    it('rejects a non-dash scheme', () => {
        expect(parseDashUri('https://evonext.app/wallet/send')).toBeNull()
        expect(parseDashUri('bitcoin:1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBeNull()
    })

    it('rejects a dash URI with no address', () => {
        expect(parseDashUri('dash:')).toBeNull()
        expect(parseDashUri('dash://')).toBeNull()
    })

    it('rejects an unparseable string', () => {
        expect(parseDashUri('not a url')).toBeNull()
    })

    it('rejects an empty string', () => {
        expect(parseDashUri('')).toBeNull()
    })

    it('ignores a non-numeric amount', () => {
        const result = parseDashUri('dash:ADDRESS?amount=abc')

        expect(result).not.toBeNull()
        expect(result!.address).toBe('ADDRESS')
        expect(result!.amount).toBeNull()
    })

    it('ignores a zero amount', () => {
        // A zero amount would prefill a nonsense value in the send form.
        const result = parseDashUri('dash:ADDRESS?amount=0')

        expect(result).not.toBeNull()
        expect(result!.amount).toBeNull()
    })

    it('ignores a negative amount', () => {
        const result = parseDashUri('dash:ADDRESS?amount=-5')

        expect(result).not.toBeNull()
        expect(result!.amount).toBeNull()
    })

    it('ignores an empty amount parameter', () => {
        const result = parseDashUri('dash:ADDRESS?amount=')

        expect(result).not.toBeNull()
        expect(result!.amount).toBeNull()
    })

    it('ignores unrelated query parameters', () => {
        const result = parseDashUri('dash:ADDRESS?label=tip&amount=2&message=hi')

        expect(result).not.toBeNull()
        expect(result!.address).toBe('ADDRESS')
        expect(result!.amount).toBe(2)
    })
})

describe('useDeepLink routing', () => {
    beforeEach(() => {
        onOpenUrlMock.mockReset()
        getCurrentMock.mockReset()
        onOpenUrlMock.mockResolvedValue(() => {})
        getCurrentMock.mockResolvedValue(null)
    })

    it('navigates to the send screen with recipient and amount', async () => {
        const push = vi.fn()
        // NOTE: one instance — `push` is per-instance state, so starting a
        //       listener on a different instance would not bind this one.
        const deepLink = useDeepLink()

        await deepLink.start(push)
        deepLink.openPayment({ address: 'ADDRESS', amount: 0.1 })

        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'ADDRESS', amount: '0.1' },
        })
    })

    it('omits the amount query parameter when there is no amount', async () => {
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)
        deepLink.openPayment({ address: 'ADDRESS', amount: null })

        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'ADDRESS' },
        })
    })

    it('does nothing when push is not bound', () => {
        const { openPayment } = useDeepLink()

        // No start() call, so no router is bound.
        expect(() => openPayment({ address: 'ADDRESS', amount: 1 })).not.toThrow()
    })

    it('routes a URL delivered through the plugin listener', async () => {
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)

        // The mock captured the handler passed to onOpenUrl; invoke it.
        const handler = onOpenUrlMock.mock.calls[0]?.[0] as (urls: string[]) => void
        handler(['dash:ADDRESS?amount=3'])

        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'ADDRESS', amount: '3' },
        })
    })

    it('routes the launch URL via getCurrent', async () => {
        const push = vi.fn()
        getCurrentMock.mockResolvedValue(['dash:LAUNCHADDR?amount=7'])
        const deepLink = useDeepLink()

        await deepLink.start(push)

        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'LAUNCHADDR', amount: '7' },
        })
    })

    it('ignores an empty URL list', () => {
        const push = vi.fn()
        const { handleUrls } = useDeepLink()

        expect(() => handleUrls([])).not.toThrow()
        expect(push).not.toHaveBeenCalled()
    })

    it('ignores null from the plugin', () => {
        const push = vi.fn()
        const { handleUrls } = useDeepLink()

        expect(() => handleUrls(null)).not.toThrow()
        expect(push).not.toHaveBeenCalled()
    })

    it('navigates only once when several payment URIs arrive together', async () => {
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)
        deepLink.handleUrls(['dash:FIRST?amount=1', 'dash:SECOND?amount=2'])

        expect(push).toHaveBeenCalledTimes(1)
        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'FIRST', amount: '1' },
        })
    })

    it('skips non-payment URLs in a mixed list', async () => {
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)
        deepLink.handleUrls(['https://evonext.app/foo', 'dash:REAL?amount=4'])

        expect(push).toHaveBeenCalledTimes(1)
        expect(push).toHaveBeenCalledWith({
            path: '/wallet/send',
            query: { recipient: 'REAL', amount: '4' },
        })
    })

    it('does not leak the listener when start is called twice', async () => {
        // A leaked listener makes the OS deliver every URL twice.
        const first = vi.fn()
        const second = vi.fn()
        onOpenUrlMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)
        await deepLink.start(push)

        expect(first).toHaveBeenCalledTimes(1)
        expect(second).not.toHaveBeenCalled()
    })

    it('stops listening and unbinds the router', async () => {
        const unlisten = vi.fn()
        onOpenUrlMock.mockResolvedValue(unlisten)
        const push = vi.fn()
        const deepLink = useDeepLink()

        await deepLink.start(push)
        deepLink.stop()
        deepLink.openPayment({ address: 'ADDRESS', amount: 1 })

        expect(unlisten).toHaveBeenCalled()
        expect(push).not.toHaveBeenCalled()
    })

    it('survives getCurrent rejecting (normal startup with no deep link)', async () => {
        getCurrentMock.mockRejectedValue(new Error('no deep link'))
        const push = vi.fn()
        const deepLink = useDeepLink()

        await expect(deepLink.start(push)).resolves.toBeUndefined()
        expect(push).not.toHaveBeenCalled()
    })
})
