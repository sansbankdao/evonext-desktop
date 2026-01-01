// src/stores/posts/getters.ts

import type { IPost } from '@/types/posts'

// Define getters flatly inside the object, then export default
const getters = {
    getPostById: (state: any) => (id: string) => {
        return state.posts.find((post: IPost) => post.id === id)
    },

    isPostLiked: (state: any) => (id: string) => {
        return state.likedPosts.includes(id)
    },

    sortedPosts: (state: any) => {
        return [...state.posts].sort((a: IPost, b: IPost) => {
            const aTime = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()
            const bTime = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()
            return bTime - aTime
        })
    },

    sortedUserPosts: (state: any) => {
        return [...state.userPosts].sort((a: IPost, b: IPost) => {
            const aTime = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()
            const bTime = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()
            return bTime - aTime
        })
    },

    recentPosts: (state: any) => {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        return state.posts.filter((post: IPost) => {
             const time = typeof post.createdAt === 'number' ? post.createdAt : new Date(post.createdAt).getTime()
             return time > oneDayAgo
        })
    }
}

// EXPORT DEFAULT (Flat structure for Pinia)
export default getters
