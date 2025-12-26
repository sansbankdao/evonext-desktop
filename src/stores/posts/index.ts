// src/stores/posts/index.ts

import { defineStore } from 'pinia'
import type { IPostsState } from '@/types/posts'
import state from './state'
import getters from './getters'
import actions from './actions'

export const usePostsStore = defineStore('posts', {
    state: (): IPostsState => state,
    getters,
    actions
})
