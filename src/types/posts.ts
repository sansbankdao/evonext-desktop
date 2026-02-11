// src/types/posts.ts

import type { IUser } from './identity'

/**
 * Base properties shared across documents and UI models
 */
interface IPostBase {
    content: string;
    isSensitive: boolean;
    language: string;
    remix?: string | undefined;
    hashtag?: string | undefined;
    mediaUrls?: string[] | undefined;
    mentionIds?: string[] | undefined;
    replyToPostId?: string | undefined;
}

/**
 * Media object for rich UI rendering
 */
export interface IMedia {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string | undefined;
    alt?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
}

/**
 * The literal shape of a Post as stored on the Dash Platform
 */
export interface IPostDocument extends IPostBase {
    id: string; // Added to resolve transformer errors
    ownerId: string;
    dataContractId: string;
    revision: number;
    createdAt: number;
    updatedAt: number | null;
    $id?: string;
    $ownerId?: string;
}

/**
 * The "Hydrated" Post object used throughout the Vue application.
 */
export interface IPost extends IPostBase {
    id: string; // Added to resolve transformer errors
    contractId: string;
    documentId?: string | undefined;
    ownerId: string;
    author: IUser;
    createdAt: number;
    updatedAt: number | null;
    likes: number;
    remixes: number;
    replies: number;
    views: number;
    liked?: boolean | undefined;
    remixed?: boolean | undefined;
    bookmarked?: boolean | undefined;
    media?: IMedia[] | undefined;
    replyTo?: IPost | undefined;
    quotedPost?: IPost | undefined;
}

export interface ICreatePostParams {
    content: string;
    isSensitive?: boolean | undefined;
    language?: string | undefined;
    remix?: string | undefined;
    hashtag?: string | undefined;
    mediaUrl?: string[] | undefined;
    mentionIds?: string[] | undefined;
    replyToPostId?: string | undefined;
}

export interface IUpdatePostParams {
    documentId: string;
    content?: string | undefined;
    isSensitive?: boolean | undefined;
    language?: string | undefined;
    hashtag?: string | undefined;
    mediaUrl?: string[] | undefined;
    mentionIds?: string[] | undefined;
}

export interface IPostStats {
    likes: number;
    remixes: number;
    replies: number;
    bookmarks?: number | undefined;
}

export interface IComment {
    author: IUser;
    content: string;
    createdAt: Date;
    likes: number;
    liked?: boolean | undefined;
    postId: string;
}

export interface INotification {
    type: 'like' | 'remix' | 'follow' | 'reply' | 'mention';
    from: IUser;
    post?: IPost | undefined;
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
    hasNextPage: boolean;
    limit: number;
    offset: number;
}

export interface PostsFetchResult {
    posts: IPost[];
    nextPage?: string | undefined;
    hasNextPage: boolean;
}

export interface PostsFetchOptions {
    id?: string | undefined;
    ownerId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    fromDate?: Date | undefined;
    toDate?: Date | undefined;
    language?: string | undefined;
    orderBy?: 'newest' | 'oldest' | undefined;
}

export interface IPostFilters {
    language?: string | undefined;
    fromDate?: Date | undefined;
    toDate?: Date | undefined;
    hashtag?: string | undefined;
    isSensitive?: boolean | undefined;
}
