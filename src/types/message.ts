// src/types/message.ts

/**
 * ================================================
 * DIRECT MESSAGING SYSTEM TYPES
 * ================================================
 */

/**
 * Message - Core message object
 */
export interface IMessage {
    // Core identifiers
    threadId: string;              // Conversation/thread ID
    senderId: string;              // Sender's user/identity ID
    recipientId?: string;          // Single recipient ID (for 1:1)
    recipientIds?: string[];       // Multiple recipients (for group)

    // Content
    content: string;               // Message text (markdown/plain)
    contentType: MessageContentType;
    attachments?: IAttachment[];    // Files, media, etc.
    reactions?: IReaction[];       // Reactions to this message
    replyTo?: string;              // ID of message being replied to
    forwardFrom?: string;          // Original message ID if forwarded
    quotedMessage?: IQuotedMessage; // Quoted message preview

    // Metadata
    timestamp: Date;               // When the message was sent
    editedAt?: Date;               // When last edited (if applicable)
    deletedAt?: Date;              // When deleted (soft delete)
    deletedBy?: string;            // Who deleted it (sender or admin)

    // Delivery & read status
    status: MessageStatus;
    deliveredAt?: Date;            // When delivered to recipient(s)
    readBy: IReadReceipt[];        // Who has read the message
    failedReason?: string;         // Why delivery failed

    // Encryption & security
    encrypted: boolean;            // Is message end-to-end encrypted
    encryptionMethod?: string;     // e.g., 'signal-protocol', 'pgp'
    signature?: string;            // Digital signature
    verification?: MessageVerification;

    // Context
    clientInfo?: IClientInfo;      // Client that sent the message
    location?: ILocation;          // Location data (if shared)
    metadata?: Record<string, any>; // Additional custom metadata
}

/**
 * Message Content Types
 */
export type MessageContentType =
    | 'text'              // Plain text
    | 'markdown'          // Markdown formatted
    | 'rich_text'         // Rich text with formatting
    | 'code'              // Code snippet
    | 'audio'             // Audio message
    | 'video'             // Video message
    | 'image'             // Image
    | 'file'              // File attachment
    | 'contact'           // Contact card
    | 'location'          // Location sharing
    | 'poll'              // Poll
    | 'sticker'           // Sticker
    | 'gif'               // Animated GIF
    | 'voice_note'        // Voice recording
    | 'video_note'        // Video recording (like Telegram video note)
    | 'system'            // System message (joined, left, etc.)
    | 'payment'           // Payment/crypto transaction
    | 'invitation'        // Group/call invitation
    | 'custom';           // Custom content type

/**
 * Message Status
 */
export type MessageStatus =
    | 'sending'           // Being sent
    | 'sent'              // Sent from client
    | 'delivered'         // Delivered to server/recipient
    | 'read'              // Read by recipient(s)
    | 'failed'            // Failed to send
    | 'pending'           // Waiting for encryption/processing
    | 'queued'            // Queued for delivery
    | 'expired';          // Expired (for ephemeral messages)

/**
 * Attachment - File/media attachment
 */
export interface IAttachment {
    type: AttachmentType;
    url?: string;                  // Direct URL (for hosted)
    path?: string;                 // Local path
    filename: string;
    mimeType: string;
    size: number;                  // Size in bytes
    duration?: number;             // For audio/video (seconds)
    dimensions?: {
        width: number;
        height: number;
    };
    thumbnail?: string;            // Thumbnail URL/path
    caption?: string;              // Caption for media
    metadata?: Record<string, any>;
    encryption?: {
        key: string;                 // Encryption key
        iv?: string;                 // Initialization vector
    };
}
export type AttachmentType =
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'sticker'
    | 'voice_note'
    | 'video_note'
    | 'archive'
    | 'other';

/**
 * Reaction to a message
 */
export interface IReaction {
    userId: string;
    emoji: string;                 // Unicode emoji or custom ID
    timestamp: Date;
    metadata?: {
        skinTone?: number;           // 1-6 for skin tone modifiers
        isCustom?: boolean;          // Custom emoji/reaction
        customId?: string;           // ID for custom emoji
    };
}

/**
 * Read receipt
 */
export interface IReadReceipt {
    userId: string;
    timestamp: Date;
    deviceId?: string;             // Which device read it
}

/**
 * Quoted message (for replies)
 */
export interface IQuotedMessage {
    messageId: string;
    senderId: string;
    content: string;
    contentType: MessageContentType;
    timestamp: Date;
    attachments?: IAttachment[];
    isForwarded?: boolean;
    forwardFrom?: string;
}

/**
 * Client information
 */
export interface IClientInfo {
    platform: 'web' | 'mobile' | 'desktop' | 'tablet' | 'wearable';
    os: string;                    // 'iOS 16', 'Android 13', 'Windows 11'
    appVersion: string;
    deviceId: string;
    deviceName?: string;
    ipAddress?: string;
}

/**
 * Location data
 */
export interface ILocation {
    latitude: number;
    longitude: number;
    accuracy?: number;             // Accuracy in meters
    altitude?: number;
    address?: string;
    venue?: {
        name: string;
        address?: string;
        type?: string;              // 'restaurant', 'park', etc.
    };
    timestamp?: Date;
    live?: boolean;               // Live location sharing
    expiresAt?: Date;             // For live locations
}

/**
 * Message verification (for signed messages)
 */
export interface MessageVerification {
    verified: boolean;
    method: 'signature' | 'key_verification' | 'blockchain';
    signature?: string;
    publicKey?: string;
    timestamp?: Date;
    verifiedBy?: string[];         // Who verified it
}

/**
 * ================================================
 * CONVERSATION/THREAD TYPES
 * ================================================
 */

/**
 * Conversation/Thread - Group of messages between participants
 */
export interface IConversation {
    type: ConversationType;
    participants: IParticipant[];  // All participants
    lastMessage?: IMessage;         // Most recent message
    unreadCount: number;           // Unread messages for current user
    muted: boolean;
    archived: boolean;
    pinned: boolean;
    // Metadata
    title?: string;                // Group/conversation title
    description?: string;          // Group description
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    // Group-specific
    groupInfo?: IGroupInfo;
    // Ephemeral settings
    ephemeralSettings?: IEphemeralSettings;
    // Notifications
    notifications: NotificationSettings;
    // Encryption
    encrypted: boolean;
    encryptionKey?: string;        // Group encryption key
}

/**
 * Conversation Types
 */
export type ConversationType =
    | 'direct'          // 1:1 conversation
    | 'group'           // Multi-user group
    | 'channel'         // Broadcast channel (one-to-many)
    | 'broadcast'       // Broadcast to multiple people
    | 'secret_chat';    // End-to-end encrypted 1:1

/**
 * Participant in a conversation
 */
export interface IParticipant {
    userId: string;
    role: ParticipantRole;
    joinedAt: Date;
    leftAt?: Date;
    lastReadAt?: Date;            // Last time they read messages
    notifications?: NotificationSettings;
    typing?: {
        isTyping: boolean;
        lastTypingAt?: Date;
    };
    // Admin/moderation fields
    permissions?: ParticipantPermissions;
    banned?: boolean;
    bannedUntil?: Date;
    banReason?: string;
}
export type ParticipantRole =
    | 'member'
    | 'admin'
    | 'owner'
    | 'moderator'
    | 'read_only';

/**
 * Group info for group conversations
 */
export interface IGroupInfo {
    createdBy: string;
    createdAt: Date;
    admins: string[];              // User IDs of admins
    moderators: string[];          // User IDs of moderators
    // Group settings
    privacy: 'public' | 'private' | 'secret';
    inviteLink?: string;           // Invite link for public groups
    inviteRestrictions?: {
        requiresApproval: boolean;
        maxUses?: number;
        expiresAt?: Date;
    };
    // Group limits
    maxParticipants?: number;
    // Group features
    features: GroupFeature[];
    // Group permissions
    permissions: GroupPermissions;
}
export type GroupFeature =
    | 'slow_mode'          // Rate limiting
    | 'polling'            // Can create polls
    | 'file_sharing'       // Can share files
    | 'voice_messages'     // Can send voice messages
    | 'video_calls'        // Supports video calls
    | 'voice_calls'        // Supports voice calls
    | 'admin_tools'        // Admin moderation tools
    | 'analytics'          // Group analytics
    | 'bots';              // Supports bots
export interface GroupPermissions {
    sendMessages: 'all' | 'admins' | 'verified';
    sendMedia: 'all' | 'admins' | 'verified';
    sendStickers: 'all' | 'admins' | 'verified';
    sendPolls: 'all' | 'admins' | 'verified';
    changeInfo: 'all' | 'admins';
    pinMessages: 'all' | 'admins';
    inviteUsers: 'all' | 'admins';
    addAdmins: 'owner' | 'admins';
}
export interface ParticipantPermissions {
    canSendMessages: boolean;
    canSendMedia: boolean;
    canAddParticipants: boolean;
    canRemoveParticipants: boolean;
    canChangeGroupInfo: boolean;
    canPinMessages: boolean;
    canDeleteMessages: boolean;    // Delete others' messages
    canBanParticipants: boolean;
}

/**
 * Ephemeral message settings
 */
export interface IEphemeralSettings {
    enabled: boolean;
    deleteAfter: EphemeralDuration;
    hideAfterRead: boolean;
    screenshotDetection?: boolean;
    forwardingDisabled: boolean;
    copyingDisabled: boolean;
}
export type EphemeralDuration =
    | 'never'
    | '5_seconds'
    | '10_seconds'
    | '30_seconds'
    | '1_minute'
    | '5_minutes'
    | '1_hour'
    | '6_hours'
    | '12_hours'
    | '1_day'
    | '1_week'
    | 'custom';

/**
 * Notification settings
 */
export interface NotificationSettings {
    enabled: boolean;
    muteUntil?: Date;
    sound: string;                 // Notification sound
    vibrate: boolean;
    showPreview: boolean;          // Show message preview
    mentionsOnly: boolean;         // Only notify on mentions
    customKeywords?: string[];     // Notify on specific keywords
}

/**
 * ================================================
 * MESSAGE DELIVERY & SYNC TYPES
 * ================================================
 */

/**
 * Message delivery receipt
 */
export interface IDeliveryReceipt {
    messageId: string;
    threadId: string;
    status: MessageStatus;
    timestamp: Date;
    recipientId?: string;          // Specific recipient
    deviceId?: string;             // Which device received it
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
}

/**
 * Message sync state (for multi-device sync)
 */
export interface ISyncState {
    userId: string;
    deviceId: string;
    lastSyncedAt: Date;
    sequenceId: number;            // Last processed sequence
    pendingMessages: IPendingMessage[];
    syncToken?: string;            // For incremental sync
}
export interface IPendingMessage {
    messageId: string;
    threadId: string;
    status: 'pending' | 'sent' | 'failed';
    retries: number;
    lastAttempt?: Date;
    nextRetry?: Date;
}

/**
 * Typing indicator
 */
export interface ITypingIndicator {
    threadId: string;
    userId: string;
    isTyping: boolean;
    timestamp: Date;
    deviceId?: string;
    action?: 'typing' | 'recording_audio' | 'uploading_photo' | 'uploading_video';
}

/**
 * Message search criteria
 */
export interface IMessageSearchCriteria {
    threadId?: string;
    senderId?: string;
    content?: string;
    contentType?: MessageContentType;
    hasAttachments?: boolean;
    attachmentType?: AttachmentType;
    dateFrom?: Date;
    dateTo?: Date;
    keywords?: string[];
    mentionedUserId?: string;
    reactions?: string[];          // Emoji reactions to search for
    isForwarded?: boolean;
    isReply?: boolean;
    isEdited?: boolean;
    isDeleted?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'relevance';
    sortOrder?: 'asc' | 'desc';
}

/**
 * ================================================
 * MESSAGE OPERATIONS & EVENTS
 * ================================================
 */

/**
 * Message operation (for undo/redo)
 */
export interface IMessageOperation {
    type: 'send' | 'edit' | 'delete' | 'forward' | 'reply' | 'react' | 'unreact';
    message: IMessage;
    timestamp: Date;
    performedBy: string;
    deviceId: string;
    previousState?: IMessage;      // For edit/delete operations
}

/**
 * Message event (for real-time updates)
 */
export interface IMessageEvent {
    type: MessageEventType;
    message?: IMessage;
    conversation?: IConversation;
    receipt?: IDeliveryReceipt;
    typing?: ITypingIndicator;
    participant?: IParticipant;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export type MessageEventType =
    | 'message_sent'
    | 'message_received'
    | 'message_delivered'
    | 'message_read'
    | 'message_edited'
    | 'message_deleted'
    | 'typing_started'
    | 'typing_stopped'
    | 'conversation_created'
    | 'conversation_updated'
    | 'conversation_deleted'
    | 'participant_joined'
    | 'participant_left'
    | 'participant_updated'
    | 'reaction_added'
    | 'reaction_removed'
    | 'call_started'
    | 'call_ended';

/**
 * ================================================
 * MESSAGE FILTERING & ORGANIZATION
 * ================================================
 */

/**
 * Message filter (for client-side filtering)
 */
export interface IMessageFilter {
    threadIds?: string[];
    senderIds?: string[];
    contentTypes?: MessageContentType[];
    hasAttachments?: boolean;
    attachmentTypes?: AttachmentType[];
    dateRange?: {
        from: Date;
        to: Date;
    };
    keywords?: string[];
    mentionedMe?: boolean;
    unreadOnly?: boolean;
    starredOnly?: boolean;
    withReactions?: boolean;
}

/**
 * Message label/tag (for organization)
 */
export interface IMessageLabel {
    name: string;
    color: string;
    messages: string[];            // Message IDs
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Message folder (for organization)
 */
export interface IMessageFolder {
    name: string;
    icon?: string;
    filters: IMessageFilter;
    position: number;              // For sorting
    createdAt: Date;
    updatedAt: Date;
}

/**
 * ================================================
 * MESSAGE SECURITY & MODERATION
 * ================================================
 */

/**
 * Message moderation result
 */
export interface IMessageModeration {
    messageId: string;
    moderated: boolean;
    action: 'none' | 'warn' | 'hide' | 'delete' | 'ban';
    reason?: string;
    moderatedBy?: string;
    moderatedAt: Date;
    appealable: boolean;
    appealDeadline?: Date;
    metadata?: {
        ruleViolated?: string;
        confidence?: number;          // AI confidence score
        automated?: boolean;          // Was this automated moderation
    };
}

/**
 * Message report
 */
export interface IMessageReport {
    messageId: string;
    reporterId: string;
    reportType: ReportType;
    description?: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    resolvedBy?: string;
    resolvedAt?: Date;
    resolution?: string;
    createdAt: Date;
}
export type ReportType =
    | 'spam'
    | 'harassment'
    | 'hate_speech'
    | 'violence'
    | 'nudity'
    | 'copyright'
    | 'impersonation'
    | 'scam'
    | 'other';

/**
 * Message encryption key
 */
export interface IEncryptionKey {
    threadId: string;
    userId: string;
    key: string;                    // Encrypted/serialized key
    keyType: 'session' | 'identity' | 'group';
    algorithm: string;
    createdAt: Date;
    expiresAt?: Date;
    rotatedAt?: Date;
}

/**
 * ================================================
 * ANALYTICS & INSIGHTS
 * ================================================
 */

/**
 * Message statistics
 */
export interface IMessageStats {
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    messagesByType: Record<MessageContentType, number>;
    messagesByDay: Array<{
        date: Date;
        count: number;
        sent: number;
        received: number;
    }>;
    topConversations: Array<{
        threadId: string;
        messageCount: number;
        participants: number;
        lastMessage: Date;
    }>;
    mostActiveTimes: Array<{
        hour: number;                // 0-23
        messageCount: number;
    }>;
    averageResponseTime: number;    // In minutes
}

/**
 * Conversation insights
 */
export interface IConversationInsights {
    threadId: string;
    participantCount: number;
    messageCount: number;
    firstMessage: Date;
    lastMessage: Date;
    totalDuration: number;          // In days
    activeDays: number;
    mostActiveParticipant: string;
    averageMessagesPerDay: number;
    topKeywords: string[];
    sentiment?: {
        positive: number;             // 0-1
        negative: number;             // 0-1
        neutral: number;              // 0-1
    };
    attachmentStats: {
        total: number;
        byType: Record<AttachmentType, number>;
        totalSize: number;            // In bytes
    };
}

/**
 * ================================================
 * UTILITY TYPES & HELPERS
 * ================================================
 */

/**
 * Message compose state (draft)
 */
export interface IMessageDraft {
    threadId?: string;
    recipientIds?: string[];
    content: string;
    contentType: MessageContentType;
    attachments: IAttachment[];
    replyTo?: string;
    quotedMessage?: IQuotedMessage;
    scheduledFor?: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Bulk message operation
 */
export interface IBulkMessageOperation {
    operation: 'delete' | 'archive' | 'move' | 'label' | 'mark_as_read' | 'mark_as_unread';
    messageIds: string[];
    threadId?: string;
    destination?: {
        folderId?: string;
        labelId?: string;
    };
    performedBy: string;
    timestamp: Date;
}

/**
 * Message export format
 */
export interface IMessageExport {
    exportId: string;
    userId: string;
    format: 'json' | 'csv' | 'html' | 'pdf';
    include: {
        messages: boolean;
        attachments: boolean;
        media: boolean;
        metadata: boolean;
    };
    dateRange?: {
        from: Date;
        to: Date;
    };
    threadIds?: string[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    createdAt: Date;
    completedAt?: Date;
}

// Type guards
export function isMessage(obj: any): obj is IMessage {
    return obj &&
        typeof obj.id === 'string' &&
        typeof obj.threadId === 'string' &&
        typeof obj.senderId === 'string' &&
        typeof obj.content === 'string' &&
        obj.timestamp instanceof Date;
}
export function isConversation(obj: any): obj is IConversation {
    return obj &&
        typeof obj.id === 'string' &&
        Array.isArray(obj.participants) &&
        obj.createdAt instanceof Date;
}

// Helper: Create a system message
// export function createSystemMessage(
//     threadId: string,
//     content: string,
//     metadata?: Record<string, any>
// ): Partial<IMessage> {
//     return {
//         threadId,
//         content,
//         contentType: 'system',
//         timestamp: new Date(),
//         metadata,
//         status: 'sent'
//     };
// }

// Helper: Create typing indicator
// export function createTypingIndicator(
//     threadId: string,
//     userId: string,
//     isTyping: boolean,
//     action?: ITypingIndicator['action']
// ): ITypingIndicator {
//     return {
//         threadId,
//         userId,
//         isTyping,
//         timestamp: new Date(),
//         action
//     };
// }
