// src/libs/posts/transformers.ts

/* Import modules. */
import type { IPostDocument, IPost } from '@/types/posts'
import { getUserInfo } from './userInfo'

/**
 * Generate a consistent ID for a post
 */
export function generatePostId(doc: IPostDocument): string {
    // Use a combination of contract ID and creation timestamp for uniqueness
    return `${doc.dataContractId.slice(0, 8)}-${doc.createdAt}`
}

/**
 * Transform blockchain document to IPost format
 */
export async function transformPostDocument(doc: IPostDocument): Promise<IPost> {
    const author = await getUserInfo(doc.ownerId)

    return {
        id: doc.id,
        ownerId: doc.ownerId,
        author,
        content: doc.content,
        createdAt: new Date(parseInt(doc.createdAt)),
        updatedAt: new Date(parseInt(doc.updatedAt)),
        likes: 0,
        remixes: 0,
        replies: 0,
        bookmarks: 0,
        isSensitive: doc.isSensitive || false,
        language: doc.language || 'en',
        remix: doc.remix,
        hashtag: doc.hashtag,
        mediaUrls: doc.mediaUrl,
        mentionIds: doc.mentionIds,
        replyToPostId: doc.replyToPostId?.[0]
    }
}
