// src/types/posts.ts

import type { IUser } from './identity'

export interface IMedia {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
    alt?: string;
    width?: number;
    height?: number;
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

export interface IPostDocument {
    id: string;
    ownerId: string;
    dataContractId: string;
    documentTypeName: string | null;
    revision: number;
    createdAt: number;
    updatedAt: number | null;
    createdAtBlockHeight: number | null;
    updatedAtBlockHeight: number | null;
    createdAtCoreBlockHeight: number | null;
    updatedAtCoreBlockHeight: number | null;
    transferredAt: string | null;
    transferredAtBlockHeight: number | null;
    transferredAtCoreBlockHeight: number | null;
    entropy: string | null;
    content: string;
    isSensitive: boolean;
    language: string;
    remix?: string;
    hashtag?: string;
    mediaUrl?: string[];
    mentionIds?: string[];
    replyToPostId?: string[];
    $ownerId?: string; // Added to support some raw document types
}

export interface IPost {
    id?: string; // Optional for optimistic creation
    ownerId: string;
    author: IUser;
    content: string;
    createdAt: number;
    updatedAt: number | null;
    likes: number;
    remixes: number;
    replies: number;
    views: number; // Added: Required by UI
    bookmarks?: number;
    isSensitive: boolean;
    language: string;
    remix?: string | undefined;
    hashtag?: string | undefined;
    media?: IMedia[];
    mediaUrls?: string[] | undefined; // Added: Renamed from mediaUrl to match usage
    mediaUrl?: string[] | undefined;  // Kept for backward compatibility
    mentionIds?: string[] | undefined;
    replyToPostId?: string | undefined;
    replyTo?: IPost | undefined;
    quotedPost?: IPost | undefined;
    liked?: boolean;
    remixed?: boolean;
    bookmarked?: boolean;
}

export interface IPostStats {
    likes: number;
    remixes: number;
    replies: number;
    bookmarks?: number;
}

export interface ICreatePostParams {
    content: string;
    isSensitive?: boolean;
    language?: string;
    remix?: string | undefined;
    hashtag?: string | undefined;
    mediaUrl?: string[] | undefined;
    mentionIds?: string[] | undefined;
    replyToPostId?: string[] | undefined;
}

export interface IUpdatePostParams {
    documentId: string;
    content?: string;
    isSensitive?: boolean;
    language?: string;
    remix?: string;
    hashtag?: string;
    mediaUrl?: string[];
    mentionIds?: string[];
}

export interface ILikeDocument {
    postId: string;
    ownerId: string;
    dataContractId: string;
    documentTypeName: string | null;
    revision: number;
    createdAt: number;
    updatedAt: number | null;
}

export interface IPostsState {
    posts: IPost[];
    userPosts: IPost[];
    likedPosts: string[]; // Array of post IDs
    bookmarkedPosts: string[]; // Array of post IDs
    isLoading: boolean;
    error: string | null;
    lastFetched: Date | null;
    nextPage?: string; // Allow undefined
    hasNextPage: boolean;
    // Added for pagination
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
