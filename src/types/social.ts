// src/types/social.ts

/**
 * DTOs returned by the Rust `fetch_social_feed` command
 * (src-tauri/src/social/mod.rs). Field names match the serde camelCase
 * output exactly — do not rename without changing the Rust side.
 */

/** Renderable avatar resolved Rust-side; SVG generation happens locally. */
export type ISocialAvatarSource =
    | { kind: 'dicebear'; style: string; seed: string }
    | { kind: 'uri'; uri: string }

export type SocialContentPartType =
    | 'text' | 'hashtag' | 'cashtag' | 'mention' | 'url'
    | 'bold' | 'italic' | 'code'

export interface ISocialContentPart {
    type: SocialContentPartType;
    value: string;
    children?: ISocialContentPart[] | null;
}

/** Fully-resolved post author (Yappr profile → DPNS → DashPay chain). */
export interface ISocialAuthorProfile {
    identityId: string;
    displayName: string;
    username: string;
    verified: boolean;
    bio: string;
    avatar: ISocialAvatarSource;
}

export interface ISocialPost {
    id: string;
    contractId: string;
    /** 'evonext' | 'yappr' — for the source badge. */
    source: string;
    ownerId: string;
    author: ISocialAuthorProfile;
    content: string;
    contentParts: ISocialContentPart[];
    /** Milliseconds epoch (64-bit). */
    createdAt: number;
    updatedAt: number;
    replyToPostId?: string | null;
    quotedPostId?: string | null;
    replyTo?: ISocialPost | null;
    quotedPost?: ISocialPost | null;
    language: string;
    sensitive: boolean;
    mediaUrls: string[];
}

export interface ISocialFeedPage {
    posts: ISocialPost[];
    nextCursor?: string | null;
    /** Per-contract raw document counts (feeds the debug panel). */
    fetchedCounts: Record<string, number>;
    duplicateCount: number;
}
