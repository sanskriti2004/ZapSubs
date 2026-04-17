import { useState, useCallback } from 'react';
import { connectWallet, signTx } from '../services/wallet.js';
import { WalletContext } from './WalletContext.js';

export function WalletProvider({ children }) {
    const [publicKey, setPublicKey] = useState(null);
    const [error, setError] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    const connect = useCallback(async () => {
        setConnecting(true);
        setError(null);
        try {
            const key = await connectWallet();
            setPublicKey(key);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to connect wallet');
            setPublicKey(null);
        } finally {
            setConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setPublicKey(null);
        setError(null);
    }, []);

    const signTransaction = useCallback(async (xdr, network = 'TESTNET_PASSPHRASE') => {
        setIsSigning(true);
        setError(null);
        try {
            const signedXDR = await signTx(xdr, network);
            return signedXDR;
        } catch (err) {
            const errorMsg = err.message || 'Failed to sign transaction';
            setError(errorMsg);
            throw err;
        } finally {
            setIsSigning(false);
        }
    }, []);

    const contextValue = {
        publicKey,
        connect,
        disconnect,
        signTransaction,
        error,
        connecting,
        isSigning,
        isConnected: !!publicKey
    };

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
}


