// src/types/explorer.ts

// Define the TypeScript interfaces for our data
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
