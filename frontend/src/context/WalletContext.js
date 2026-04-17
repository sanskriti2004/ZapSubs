import { useState, useEffect, useCallback, createContext } from 'react';
import {
    isConnected,
    getPublicKey,
    requestAccess,
    signTransaction,
} from '@stellar/freighter-api';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [publicKey, setPublicKey]   = useState(null);
    const [error, setError]           = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [isSigning, setIsSigning]   = useState(false);

    // On mount: if Freighter is already authorized, auto-restore session
    useEffect(() => {
        async function restore() {
            try {
                const connected = await isConnected();
                if (connected) {
                    const key = await getPublicKey();
                    if (key) setPublicKey(key);
                }
            } catch {
                // Freighter not installed — silently ignore on mount
            }
        }
        restore();
    }, []);

    const connect = useCallback(async () => {
        setError(null);
        setConnecting(true);
        try {
            // Check extension is installed
            const connected = await isConnected();
            if (!connected) {
                throw new Error('Freighter wallet not found. Please install the extension.');
            }
            await requestAccess();
            const key = await getPublicKey();
            if (!key) throw new Error('Could not retrieve wallet address.');
            setPublicKey(key);
        } catch (err) {
            setError(err?.message || 'Failed to connect wallet.');
        } finally {
            setConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setPublicKey(null);
        setError(null);
    }, []);

    // Call this with a raw XDR string → returns signed XDR
    const signTx = useCallback(async (xdr) => {
        if (!publicKey) throw new Error('Wallet not connected.');
        setError(null);
        setIsSigning(true);
        try {
            const network = import.meta.env.VITE_STELLAR_NETWORK || 'TESTNET';
            const signed = await signTransaction(xdr, {
                network,
                accountToSign: publicKey,
            });
            return signed;
        } catch (err) {
            const msg =
                err?.message?.toLowerCase().includes('declined') ||
                err?.message?.toLowerCase().includes('rejected')
                    ? 'Transaction rejected in Freighter.'
                    : err?.message || 'Failed to sign transaction.';
            setError(msg);
            throw new Error(msg);
        } finally {
            setIsSigning(false);
        }
    }, [publicKey]);

    return (
        <WalletContext.Provider value={{
            publicKey,
            connect,
            disconnect,
            signTx,
            error,
            connecting,
            isSigning,
            isConnected: !!publicKey,
        }}>
            {children}
        </WalletContext.Provider>
    );
}