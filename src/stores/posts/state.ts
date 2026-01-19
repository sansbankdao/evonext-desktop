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
    nextPage: undefined as string | undefined,
    hasNextPage: false,
    limit: 10,
    offset: 0,
    // Add this to preserve your debugging capability
    debug: {
        activeContracts: [],
        fetchCounts: {},
        mergeCount: 0,
        duplicateCount: 0,
        lastFetchTime: null
    }
} as IPostsState
