// src/stores/posts/state.ts

import type { IPostsState } from '@/types'

export default {
    posts: [],
    userPosts: [],
    likedPosts: [],
    bookmarkedPosts: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    nextPage: undefined,
    hasNextPage: false
} as IPostsState
