// src/stores/posts/state.ts

import type { IPostsState } from '@/types/posts'

export default {
    posts: [],
    userPosts: [],
    likedPosts: [],
    bookmarkedPosts: [],
    isLoading: false,
    error: null,
    lastFetched: null,
    // FIX: Cast undefined to allow assignment, or use 'undefined as string | undefined'
    // if you update your interface. For now, simple casting solves the overlap check.
    nextPage: undefined as string | undefined,
    hasNextPage: false,
    limit: 10,
    offset: 0
} as IPostsState
