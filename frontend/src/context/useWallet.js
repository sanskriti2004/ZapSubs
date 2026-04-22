import { useContext } from 'react';
import { WalletContext } from './WalletContext.js';

export function useWallet() {
    return useContext(WalletContext);
}