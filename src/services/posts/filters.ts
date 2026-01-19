// src/services/posts/filters.ts

import type { IPost } from '@/types/posts'

export type SortOrder = 'newest' | 'oldest' | 'most-liked' | 'most-replies' | 'most-remixed'
export type SensitiveFilter = 'show' | 'hide' | 'only'

export interface FilterOptions {
    searchQuery?: string
    ownerId?: string
    language?: string
    fromDate?: Date
    toDate?: Date
    sortBy?: SortOrder
    sensitiveFilter?: SensitiveFilter
    limit?: number
    offset?: number
}

/**
 * Apply search filter to posts
 */
export function applySearchFilter(posts: IPost[], searchQuery: string): IPost[] {
    if (!searchQuery.trim()) return posts

    const query = searchQuery.toLowerCase()
    return posts.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.author.displayName?.toLowerCase().includes(query) ||
        post.author.username?.toLowerCase().includes(query) ||
        (post.hashtag && post.hashtag.toLowerCase().includes(query)) ||
        post.mentionIds?.some(id => id.toLowerCase().includes(query)) ||
        post.language?.toLowerCase().includes(query)
    )
}

/**
 * Apply language filter to posts
 */
export function applyLanguageFilter(posts: IPost[], language?: string): IPost[] {
    if (!language) return posts
    return posts.filter(post => post.language === language)
}

/**
 * Apply sensitive content filter to posts
 */
export function applySensitiveFilter(posts: IPost[], filter: SensitiveFilter): IPost[] {
    switch (filter) {
        case 'hide':
            return posts.filter(post => !post.isSensitive)
        case 'only':
            return posts.filter(post => post.isSensitive)
        case 'show':
        default:
            return posts
    }
}

/**
 * Apply date range filter to posts
 */
export function applyDateFilter(posts: IPost[], fromDate?: Date, toDate?: Date): IPost[] {
    let filtered = [...posts]

    // FIX: Convert timestamps to numbers for comparison
    if (fromDate) {
        const fromTime = fromDate.getTime()
        filtered = filtered.filter(post => {
            const time = typeof post.createdAt === 'number' ? post.createdAt : new Date(post.createdAt).getTime()
            return time >= fromTime
        })
    }

    if (toDate) {
        const toTime = toDate.getTime()
        filtered = filtered.filter(post => {
            const time = typeof post.createdAt === 'number' ? post.createdAt : new Date(post.createdAt).getTime()
            return time <= toTime
        })
    }

    return filtered
}

/**
 * Apply sorting to posts
 */
export function applySorting(posts: IPost[], sortBy: SortOrder): IPost[] {
    const sorted = [...posts]

    switch (sortBy) {
        case 'newest':
            sorted.sort((a, b) => {
                // FIX: Safe access to getTime()
                const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()
                const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()
                return timeB - timeA
            })
            break
        case 'oldest':
            sorted.sort((a, b) => {
                const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()
                const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()
                return timeA - timeB
            })
            break
        case 'most-liked':
            sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
            break
        case 'most-replies':
            sorted.sort((a, b) => (b.replies || 0) - (a.replies || 0))
            break
        case 'most-remixed':
            sorted.sort((a, b) => (b.remixes || 0) - (a.remixes || 0))
            break
    }

    return sorted
}

/**
 * Apply owner filter to posts
 */
export function applyOwnerFilter(posts: IPost[], ownerId?: string): IPost[] {
    if (!ownerId) return posts
    return posts.filter(post => post.ownerId === ownerId)
}

/**
 * Apply all filters to posts
 */
export function filterPosts(posts: IPost[], options: FilterOptions): IPost[] {
    let filtered = [...posts]

    // Apply owner filter
    filtered = applyOwnerFilter(filtered, options.ownerId)

    // Apply search filter
    if (options.searchQuery) {
        filtered = applySearchFilter(filtered, options.searchQuery)
    }

    // Apply language filter
    filtered = applyLanguageFilter(filtered, options.language)

    // Apply date range filter
    filtered = applyDateFilter(filtered, options.fromDate, options.toDate)

    // Apply sensitive content filter
    if (options.sensitiveFilter) {
        filtered = applySensitiveFilter(filtered, options.sensitiveFilter)
    } else {
        filtered = applySensitiveFilter(filtered, 'show') // Default to showing all
    }

    // Apply sorting
    if (options.sortBy) {
        filtered = applySorting(filtered, options.sortBy)
    } else {
        filtered = applySorting(filtered, 'newest') // Default to newest first
    }

    // Apply pagination
    if (options.limit) {
        const offset = options.offset || 0
        filtered = filtered.slice(offset, offset + options.limit)
    }

    return filtered
}

/**
 * Determine if there are more posts to load
 */
export function hasMorePosts(
    filteredPosts: IPost[],
    _allPosts: IPost[],
    limit?: number,
    offset?: number
): boolean {
    if (!limit) return false
    const currentOffset = offset || 0
    const totalFiltered = filteredPosts.length
    return currentOffset + limit < totalFiltered
}

/**
 * Get unique languages from posts
 */
export function getUniqueLanguages(posts: IPost[]): string[] {
    const languages = new Set<string>()
    posts.forEach(post => {
        if (post.language) {
            languages.add(post.language)
        }
    })
    return Array.from(languages).sort()
}

/**
 * Get unique hashtags from posts
 */
export function getUniqueHashtags(posts: IPost[]): string[] {
    const hashtags = new Set<string>()
    posts.forEach(post => {
        if (post.hashtag) {
            const cleanHashtag = post.hashtag.startsWith('#')
                ? post.hashtag.substring(1)
                : post.hashtag
            hashtags.add(cleanHashtag.toLowerCase())
        }
    })
    return Array.from(hashtags).sort()
}

/**
 * Count posts by time period
 */
export function countPostsByPeriod(posts: IPost[], period: 'day' | 'week' | 'month'): Record<string, number> {
    const counts: Record<string, number> = {}
    const now = new Date().toISOString().split('T')[0]!

    posts.forEach(post => {
        let periodKey: string

        // FIX: Handle Date objects vs Numbers
        const postDate = typeof post.createdAt === 'number' ? new Date(post.createdAt) : post.createdAt

        if (period === 'day') {
            periodKey = postDate.toISOString().split('T')[0] || now // YYYY-MM-DD
        } else if (period === 'week') {
            const weekStart = new Date(postDate)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            periodKey = weekStart.toISOString().split('T')[0] || now
        } else { // month
            periodKey = postDate.toISOString().substring(0, 7) // YYYY-MM
        }

        counts[periodKey] = (counts[periodKey] || 0) + 1
    })

    return counts
}
