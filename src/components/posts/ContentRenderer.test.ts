// src/components/posts/ContentRenderer.test.ts

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentRenderer from './ContentRenderer.vue'
import type { ISocialContentPart } from '@/types/social'

const part = (type: ISocialContentPart['type'], value: string, children: ISocialContentPart[] | null = null): ISocialContentPart => ({
    type, value, children
})

describe('ContentRenderer (Phase A rich text)', () => {
    it('renders plain text', () => {
        const wrapper = mount(ContentRenderer, { props: { parts: [part('text', 'hello')] } })
        expect(wrapper.text()).toBe('hello')
    })

    it('renders bold/italic/code with semantic tags', () => {
        const wrapper = mount(ContentRenderer, {
            props: {
                parts: [
                    part('bold', 'b'),
                    part('italic', 'i'),
                    part('code', 'c')
                ]
            }
        })
        expect(wrapper.find('strong').exists()).toBe(true)
        expect(wrapper.find('em').exists()).toBe(true)
        expect(wrapper.find('code').exists()).toBe(true)
        expect(wrapper.text()).toContain('bic')
    })

    it('renders nested children inside formatting segments', () => {
        const wrapper = mount(ContentRenderer, {
            props: {
                parts: [part('bold', '@alice', [part('mention', '@alice')])]
            }
        })
        const strong = wrapper.find('strong')
        expect(strong.exists()).toBe(true)
        expect(strong.text()).toContain('@alice')
    })

    it('renders URLs as external links, prefixing www. with https://', () => {
        const wrapper = mount(ContentRenderer, {
            props: { parts: [part('url', 'www.example.com')] }
        })
        const link = wrapper.find('a')
        expect(link.attributes('href')).toBe('https://www.example.com')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toContain('noopener')
    })

    it('renders ipfs and https URLs verbatim', () => {
        const wrapper = mount(ContentRenderer, {
            props: { parts: [part('url', 'https://dash.org'), part('url', 'ipfs://Qm')] }
        })
        const links = wrapper.findAll('a')
        expect(links[0]!.attributes('href')).toBe('https://dash.org')
        expect(links[1]!.attributes('href')).toBe('ipfs://Qm')
    })

    it('emits hashtag and mention events without the prefix character', async () => {
        const wrapper = mount(ContentRenderer, {
            props: { parts: [part('hashtag', '#dash'), part('mention', '@alice')] }
        })
        const links = wrapper.findAll('a')
        await links[0]!.trigger('click')
        await links[1]!.trigger('click')
        expect(wrapper.emitted('hashtag')).toEqual([['dash']])
        expect(wrapper.emitted('mention')).toEqual([['alice']])
    })

    it('renders cashtags as styled text', () => {
        const wrapper = mount(ContentRenderer, { props: { parts: [part('cashtag', '$DASH')] } })
        expect(wrapper.text()).toContain('$DASH')
        expect(wrapper.find('a').exists()).toBe(false)
    })
})
