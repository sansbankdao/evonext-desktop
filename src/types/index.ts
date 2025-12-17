// src/types/index.ts
export * from './explorer'
export * from './identity'
export * from './settings'
export * from './system'
export * from './wallet'
////////////////////////////////////////////////////////////////////////////////
/* Import constants for type references */
import type { IIdentity, IIdentityPublicKey } from './identity'
export interface IApp {
    creatorId: IUser;
    canvasId: string;
    type: 'blog' | 'game' | null | undefined;
    engine: 'p5' | 'phaser' | 'godot' | null | undefined;
    content: string;
    likes: number;
    createdAt: Date;
}
export interface IAppState {
    currentUser: IUser | null;
    theme: 'light' | 'dark';
    isComposeOpen: boolean;
    replyingTo: IPost | null;
    setCurrentUser: (user: IUser | null) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    setComposeOpen: (open: boolean) => void;
    setReplyingTo: (post: IPost | null) => void;
}
export interface IComment {
    author: IUser;
    content: string;
    createdAt: Date;
    likes: number;
    liked?: boolean;
    postId: string;
}
export interface ICurrency {
    USD: any;
}
// Note: IIdentity is now imported from './identity'
export interface IKeyTypes {
    masterKey: IPrivateKey | IPublicKey;
    authCritical: IPrivateKey | IPublicKey;
    authHigh: IPrivateKey | IPublicKey;
    transferKey: IPrivateKey | IPublicKey;
    encryptionKey: IPrivateKey | IPublicKey;
}
export interface ILicense {
    license_id: string;
}
export interface IMedia {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
    alt?: string;
    width?: number;
    height?: number;
}
export interface IMnemonic {
    seed_phrase: string;
}
// Removed INetwork since network is now configured via environment
// export interface INetwork {
//     network: 'testnet' | 'mainnet';
// }
export interface INotification {
    type: 'like' | 'remix' | 'follow' | 'reply' | 'mention';
    from: IUser;
    post?: IPost;
    createdAt: Date;
    read: boolean;
}
export interface IPost {
    author: IUser;
    content: string;
    createdAt: Date;
    likes: number;
    remixes: number;
    replies: number;
    views: number;
    liked?: boolean;
    remixed?: boolean;
    bookmarked?: boolean;
    media?: IMedia[];
    replyTo?: IPost;
    quotedPost?: IPost;
}
export interface IPrivateKey extends IPublicKey {
    privateKeyHex: string;
    privateKeyWif: string;
}
export interface IPublicKey {
    type?: number;
    keyType?: string;       // enumeration
    purpose: string;
    securityLevel: string;
    contractBounds: any;    // FIXME What is the type??string;
    readOnly: boolean;
    disabledAt: boolean;
}
export interface IToken {
    name: string;
    ticker: string;
    token_id_hex: string;
    iconUrl: string;
    duffs?: bigint;
    amount?: bigint;
    decimal_places: number;
    fiat: ICurrency;
}
export interface ITokenPaymentInfo {
    tokenContractId: string;
    tokenContractPosition: number;
    maximumTokenCost: bigint;
    // Removed: GasFeesPaidByWASM import since it's from pshenmic-dpp
    gasFeesPaidBy: any; // Was: GasFeesPaidByWASM - use appropriate type if needed
}
export interface ITrend {
    topic: string;
    posts: number;
    category?: string;
}
export interface ITxError {
    code: number;
    message: string;
    suggestions?: string[];
}
export interface ITxSuccess {
    txid: string;
}
export interface IUser {
    docId?: string;         // Document that stores the user's profile
    username: string;       // From DPNS - not stored in profile document
    displayName: string;
    avatar: string;         // URL for display
    avatarId?: string;      // Reference to avatar document (32-byte array as string)
    avatarData?: string;    // The encoded avatar string (16-128 chars)
    bio?: string;
    followers: number;
    following: number;
    verified?: boolean;
    joinedAt: Date;
    revision: number;
}
////////////////////////////////////////////////////////////////////////////////
export interface IUser2 {
    name: string
    address: string
}
export interface IAsset {
    ticker: string
    name: string
    amount: number
    usdValue: number
}
export interface ITransaction {
    type: 'sent' | 'received' | 'swap'
    title: string
    subtitle: string
    amount: string // Formatted amount with +/- and ticker
    status: 'Completed' | 'Pending...' | 'Failed'
    date: Date
}
export interface IBalanceChange {
    isPositive: boolean
    percent: number
    amount: number
}
// New types for store operations
export interface StoreOperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface StoreKeys {
    assets: string;
    identity: string;
    license: string;
    mnemonic: string;
    keys: string;
    settings: string;
}
// Type for environment configuration
export interface EnvironmentConfig {
    defaultNetwork: 'testnet' | 'mainnet';
    dashswapEndpoint: string;
    dapiWebApiEndpoint: string;
    platformHttpApiMainnet: string;
    platformHttpApiTestnet: string;
    priceUpdateIntervalMs: number;
    balanceRefreshIntervalMs: number;
    enablePremiumFeatures: boolean;
    enableAutoUpdate: boolean;
}
