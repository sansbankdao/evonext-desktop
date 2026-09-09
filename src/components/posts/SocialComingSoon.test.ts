// src/components/posts/SocialComingSoon.test.ts

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SocialComingSoon from './SocialComingSoon.vue'

describe('SocialComingSoon', () => {
    it('renders the Coming Soon headline', () => {
        const wrapper = mount(SocialComingSoon)
        expect(wrapper.text()).toContain('Coming Soon on Mainnet')
    })

    it('explains the Yappr contract is Testnet-only', () => {
        const wrapper = mount(SocialComingSoon)
        expect(wrapper.text()).toContain('Yappr')
        expect(wrapper.text()).toContain('Testnet')
    })
})
