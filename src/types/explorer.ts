// src/types/explorer.ts

export interface ITrendingPost {
    id: string;
    imageUrl: string;
    authorName: string;
    authorUsername: string;
    authorAvatarUrl: string;
    likes: number;
    comments: number;
}

export interface IFeaturedIdentity {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string;
}

export interface ITrend {
    topic: string;
    posts: number;
    category?: string;
}
