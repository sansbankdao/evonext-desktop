// src/types/posts.ts

import type { IUser } from './identity'

/**
 * Base properties shared across documents and UI models
 */
interface IPostBase {
    content: string;
    isSensitive: boolean;
    language: string;
    remix?: string;
    hashtag?: string;
    mediaUrls?: string[];
    mentionIds?: string[];
    replyToPostId?: string;
}

/**
 * Media object for rich UI rendering
 */
export interface IMedia {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
    alt?: string;
    width?: number;
    height?: number;
}

/**
 * The literal shape of a Post as stored on the Dash Platform
 */
export interface IPostDocument extends IPostBase {
    id: string;
    ownerId: string;
    dataContractId: string;
    revision: number;
    createdAt: number;
    updatedAt: number | null;
    $ownerId?: string;
}

/**
 * The "Hydrated" Post object used throughout the Vue application.
 * Includes author data and UI-specific states.
 */
export interface IPost extends IPostBase {
    id: string;
    contractId: string;
    documentId?: string;
    ownerId: string;
    author: IUser;
    createdAt: number;
    updatedAt: number | null;

    // Stats
    likes: number;
    remixes: number;
    replies: number;
    views: number;
    bookmarks?: number;

    // Rich Objects
    media?: IMedia[];
    replyTo?: IPost;
    quotedPost?: IPost;

    // Interaction States (Local to the current user)
    liked?: boolean;
    remixed?: boolean;
    bookmarked?: boolean;
}

/**
 * Parameters for creating a new post.
 * Note: Properties match IPostBase but are all optional except content.
 */
export interface ICreatePostParams {
    content: string;
    isSensitive?: boolean;
    language?: string;
    remix?: string;
    hashtag?: string;
    mediaUrl?: string[];
    mentionIds?: string[];
    replyToPostId?: string;
}

/**
 * Parameters for updating an existing post.
 */
export interface IUpdatePostParams {
    documentId: string;
    content?: string;
    isSensitive?: boolean;
    language?: string;
    hashtag?: string;
    mediaUrl?: string[];
    mentionIds?: string[];
}

export interface IPostStats {
    likes: number;
    remixes: number;
    replies: number;
    bookmarks?: number;
}

export interface IComment {
    author: IUser;
    content: string;
    createdAt: Date;
    likes: number;
    liked?: boolean;
    postId: string;
}

export interface INotification {
    type: 'like' | 'remix' | 'follow' | 'reply' | 'mention';
    from: IUser;
    post?: IPost;
    createdAt: Date;
    read: boolean;
}

export interface ILikeDocument {
    postId: string;
    ownerId: string;
    dataContractId: string;
    revision: number;
    createdAt: number;
    updatedAt: number | null;
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
    hasMorePosts?: boolean;
    limit: number;
    offset: number;
}

export interface PostsFetchResult {
    posts: IPost[];
    nextPage?: string;
    hasNextPage: boolean;
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

export interface IPostFilters {
    language?: string;
    fromDate?: Date;
    toDate?: Date;
    hashtag?: string;
    isSensitive?: boolean;
}
