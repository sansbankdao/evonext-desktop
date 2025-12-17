// src/types/index.ts

export * from './explorer'
export * from './identity'
export * from './settings'
export * from './system'
export * from './wallet'

////////////////////////////////////////////////////////////////////////////////
/* Import types. */
// import { GasFeesPaidByWASM } from 'pshenmic-dpp'
import type { IIdentity, IIdentityPublicKey, IPublicKey } from './identity'

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

// Note: IPublicKey is imported from './identity'
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
    name: string;
    address: string;
}

export interface IAsset {
    ticker: string;
    name: string;
    amount: number;
    usdValue: number;
}

export interface ITransaction {
    id?: string;
    type: 'sent' | 'received' | 'swap';
    title: string;
    subtitle: string;
    amount: string; // Formatted amount with +/- and ticker
    status: 'Completed' | 'Pending...' | 'Failed';
    date: Date;
}

export interface IBalanceChange {
    isPositive: boolean;
    percent: number;
    amount: number;
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

// Key management types (from wallet types)
export interface KeyDerivationResult {
    masterKey: any;  // PrivateKeyWASM instance
    authCritical: any;
    authHigh: any;
    transferKey: any;
    encryptionKey: any;
}

export interface DerivationPath {
    purpose: number;
    coinType: number;
    account: number;
    change: number;
    identityIdx: number;
    keyIdx: number;
}

export interface IdentitySearchOptions {
    minIndexSearch?: number;
    queryRegistry?: boolean;
    signatureScheme?: 'ecdsa' | 'bls' | 'hash160';
}

export interface IdentitySearchResult {
    identities: IIdentity[];
    error?: string;
}

export interface TokenBalanceResult {
    tokenId: string;
    balance: bigint;
    formattedBalance: string;
    decimals: number;
}

// Wallet types that were in wallet.ts
export interface IdentityTransfer {
    amount: number;
    sender: string | null;
    recipient: string;
    timestamp: string;
    txHash: string;
    type: string;
    blockHash: string;
    gasUsed: number;
}

export interface TokenTransition {
    amount: number;
    recipient: string;
    owner: {
        identifier: string;
        aliases: Array<{
            alias: string;
            contested: boolean;
            documentId: string;
            status: string;
            timestamp: string;
        }>
    }
    action: string;
    stateTransitionHash: string;
    timestamp: string;
    publicNote: string | null;
}

export interface ApiResponse<T> {
    resultSet: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    }
}

export interface TokenBalance {
    tokenId: {
        base58: () => string;
    }
    balance: bigint;
}

export interface BalanceResult {
    credits: bigint;
    dash: bigint;
    tokens: TokenBalance[];
}

export interface NetworkConfig {
    isTestnet: boolean;
    platformEndpoint: string;
    dapiEndpoint: string;
}

export interface TokenBalanceResponse {
    tokenId: string;
    balance: bigint;
    formattedBalance: string;
}

export interface AssetPriceUpdate {
    ticker: string;
    usdValue: number;
}

// Wallet operation types
export interface SendCreditParams {
    identityId: string;
    identityIdx: number;
    receiver: string;
    credits: bigint;
}

export interface SendTokenParams {
    identityId: string;
    identityIdx: number;
    tokenId: string;
    receiver: string;
    atomicUnits: bigint;
}

export interface TransactionResult {
    success: boolean;
    data?: ITxSuccess;
    error?: ITxError;
    hash?: string;
}

// Wallet client interface
export interface IWalletClient {
    sendCredits(params: SendCreditParams): Promise<TransactionResult>;
    sendToken(params: SendTokenParams): Promise<TransactionResult>;
    getBalances(identityId: string): Promise<BalanceResult>;
    getTokenBalance(identityId: string, tokenId: string): Promise<bigint>;
    hasSufficientBalance(identityId: string, requiredCredits: bigint): Promise<boolean>;
}
