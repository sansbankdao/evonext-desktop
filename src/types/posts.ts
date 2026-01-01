// src/types/posts.ts

import type { IUser } from './identity'

export interface IPost {
    id?: string; // Made optional to support optimistic creation
    ownerId: string;
    author: IUser;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    remixes: number;
    replies: number;
    views: number;
    bookmarks?: number;
    isSensitive: boolean;
    language: string;
    remix?: string;
    hashtag?: string;
    // Fix: Rename to plural to match usage in getters
    mediaUrls?: string[];
    mentionIds?: string[];
    replyToPostId?: string;
    liked?: boolean;
    remixed?: boolean;
    bookmarked?: boolean;
}

export interface IPostsState {
    posts: IPost[];
    userPosts: IPost[];
    likedPosts: string[];
    bookmarkedPosts: string[];
    isLoading: boolean;
    error: string | null;
    lastFetched: Date | null;
    nextPage?: string;
    hasNextPage: boolean;
    limit: number;
    offset: number;
}

export interface PostsFetchOptions {
    id?: string;
    ownerId?: string;
    limit?: number;
    offset?: number;
    fromDate?: Date;
    toDate?: Date;
    language?: string;
    orderBy?: 'newest' | 'oldest';
}
