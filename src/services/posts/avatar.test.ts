// src/services/posts/avatar.test.ts

import { describe, it, expect } from 'vitest'
import { avatarSrc, generateAvatarSvg } from './avatar'

describe('avatar island (local DiceBear generation)', () => {
    it('generates an SVG locally — no network, no third-party leak', () => {
        const svg = generateAvatarSvg('bottts', 'xyz')
        expect(svg).toContain('<svg')
        // xmlns/license strings are inert metadata; the leak being guarded
        // against is the old api.dicebear.com fetch URL.
        expect(svg).not.toContain('api.dicebear.com')
    })

    it('is deterministic for the same style+seed (yap.pr parity)', () => {
        expect(generateAvatarSvg('bottts', 'xyz')).toBe(generateAvatarSvg('bottts', 'xyz'))
        expect(generateAvatarSvg('bottts', 'xyz')).not.toBe(generateAvatarSvg('bottts', 'other'))
    })

    it('falls back to thumbs for unknown styles (Yappr behavior)', () => {
        expect(generateAvatarSvg('no-such-style', 'seed')).toBe(generateAvatarSvg('thumbs', 'seed'))
    })

    it('avatarSrc passes image URIs through untouched', () => {
        expect(avatarSrc({ kind: 'uri', uri: 'https://x.io/a.png' }, 'owner')).toBe('https://x.io/a.png')
        expect(avatarSrc({ kind: 'uri', uri: 'https://ipfs.io/ipfs/Qm' }, 'owner')).toBe('https://ipfs.io/ipfs/Qm')
    })

    it('avatarSrc renders dicebear sources as data URIs', () => {
        const src = avatarSrc({ kind: 'dicebear', style: 'bottts', seed: 'xyz' }, 'owner')
        expect(src).toMatch(/^data:image\/svg\+xml;utf8,/)
        expect(decodeURIComponent(src.slice('data:image/svg+xml;utf8,'.length)))
            .toBe(generateAvatarSvg('bottts', 'xyz'))
    })

    it('avatarSrc falls back to identity-seeded thumbs when source is missing', () => {
        const src = avatarSrc(undefined, 'owner123')
        expect(decodeURIComponent(src.slice('data:image/svg+xml;utf8,'.length)))
            .toBe(generateAvatarSvg('thumbs', 'owner123'))
    })
})
