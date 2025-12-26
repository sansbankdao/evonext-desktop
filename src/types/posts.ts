// src/types/posts.ts

export interface IPostDocument {
    id: string;
    ownerId: string;
    dataContractId: string;
    documentTypeName: string | null;
    revision: string;
    createdAt: string;
    updatedAt: string;
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
}

export interface IPost {
    id: string;
    ownerId: string;
    author: IPostAuthor;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    likes: number;
    remixes: number;
    replies: number;
    bookmarks?: number;
    isSensitive: boolean;
    language: string;
    remix?: string;
    hashtag?: string;
    mediaUrls?: string[];
    mentionIds?: string[];
    replyToPostId?: string;
    liked?: boolean;
    bookmarked?: boolean;
}

export interface IPostAuthor {
    displayName: string;
    username: string;
    avatar: string;
    bio?: string;
    verified?: boolean;
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
    remix?: string;
    hashtag?: string;
    mediaUrl?: string[];
    mentionIds?: string[];
    replyToPostId?: string[];
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
    ownerId: string;
    dataContractId: string;
    documentTypeName: string | null;
    revision: string;
    createdAt: string;
    updatedAt: string;
    postId: string;
}

export interface IPostsState {
    posts: IPost[];
    userPosts: IPost[];
    likedPosts: string[]; // Array of post IDs
    bookmarkedPosts: string[]; // Array of post IDs
    isLoading: boolean;
    error: string | null;
    lastFetched: Date | null;
    nextPage?: string;
    hasNextPage: boolean;
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
