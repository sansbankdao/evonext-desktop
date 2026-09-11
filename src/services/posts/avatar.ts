// src/services/posts/avatar.ts

/**
 * DiceBear SVG generation island — the ONLY avatar logic left client-side.
 *
 * Field parsing and priority resolution (Yappr avatar field → DashPay
 * avatarUrl → deterministic thumbs) live Rust-side
 * (src-tauri/src/social/avatar.rs); this module only turns the resolved
 * { style, seed } into an SVG string, byte-identical to yap.pr and
 * evonext-mobile because all three use @dicebear 9.4.x.
 *
 * (Rust's dicebear-core 11.0.0-rc renders DIFFERENT artwork for the same
 * style+seed — verified empirically 2026-09-11 — which is why generation
 * stays here. It is 100% local: no network call, no identity leak. This
 * replaces the old api.dicebear.com/7.x fallback URL, which leaked
 * identity IDs to a third party on every feed render.)
 */

import { createAvatar } from '@dicebear/core'
import {
    adventurer, adventurerNeutral, avataaars, avataaarsNeutral,
    bigEars, bigEarsNeutral, bigSmile, bottts, botttsNeutral,
    croodles, croodlesNeutral, funEmoji, icons, identicon, initials,
    lorelei, loreleiNeutral, micah, miniavs, notionists, notionistsNeutral,
    openPeeps, personas, pixelArt, pixelArtNeutral, rings, shapes, thumbs,
} from '@dicebear/collection'
import type { ISocialAvatarSource } from '@/types/social'

/** Default style for identity-seeded fallback avatars (Yappr uses thumbs). */
const DEFAULT_STYLE = 'thumbs'

/**
 * Style name → DiceBear collection module.
 * Mirrors Yappr's styleMap so `style` values stored in profile documents
 * render identically across clients.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STYLE_MAP: Record<string, any> = {
    'adventurer': adventurer,
    'adventurer-neutral': adventurerNeutral,
    'avataaars': avataaars,
    'avataaars-neutral': avataaarsNeutral,
    'big-ears': bigEars,
    'big-ears-neutral': bigEarsNeutral,
    'big-smile': bigSmile,
    'bottts': bottts,
    'bottts-neutral': botttsNeutral,
    'croodles': croodles,
    'croodles-neutral': croodlesNeutral,
    'fun-emoji': funEmoji,
    'icons': icons,
    'identicon': identicon,
    'initials': initials,
    'lorelei': lorelei,
    'lorelei-neutral': loreleiNeutral,
    'micah': micah,
    'miniavs': miniavs,
    'notionists': notionists,
    'notionists-neutral': notionistsNeutral,
    'open-peeps': openPeeps,
    'personas': personas,
    'pixel-art': pixelArt,
    'pixel-art-neutral': pixelArtNeutral,
    'rings': rings,
    'shapes': shapes,
    'thumbs': thumbs,
}

/** FIFO cache for generated SVGs (key = `${style}:${seed}`). */
const svgCache = new Map<string, string>()
const MAX_CACHE_SIZE = 500

/**
 * Generate a DiceBear avatar SVG string locally.
 * Results are cached; unknown styles fall back to `thumbs` (Yappr behavior).
 */
export function generateAvatarSvg(style: string, seed: string): string {
    const cacheKey = `${style}:${seed}`
    const cached = svgCache.get(cacheKey)
    if (cached) return cached

    const styleModule = STYLE_MAP[style] || thumbs
    const svg = createAvatar(styleModule, { seed }).toString()

    if (svgCache.size >= MAX_CACHE_SIZE) {
        const firstKey = svgCache.keys().next().value
        if (firstKey) svgCache.delete(firstKey)
    }
    svgCache.set(cacheKey, svg)
    return svg
}

/**
 * Turn a Rust-resolved avatar source into an <img>-bindable src:
 * DiceBear → generated-locally data URI; Uri → the (gateway-resolved) URL.
 */
export function avatarSrc(source: ISocialAvatarSource | undefined | null, identityId: string): string {
    if (source?.kind === 'uri') return source.uri
    const style = source?.kind === 'dicebear' ? source.style : DEFAULT_STYLE
    const seed = source?.kind === 'dicebear' ? source.seed : identityId
    return `data:image/svg+xml;utf8,${encodeURIComponent(generateAvatarSvg(style, seed))}`
}
