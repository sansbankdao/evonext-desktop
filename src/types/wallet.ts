// src/types/wallet.ts

/* Import types. */
import { IAsset, IBalanceChange, ITransaction, IUser2 } from './index'

export interface IWalletState {
    user: IUser2 | null;
    assets: IAsset[];
    transactions: ITransaction[];
    balanceChange: IBalanceChange | null;
    isLoading: boolean;
}
