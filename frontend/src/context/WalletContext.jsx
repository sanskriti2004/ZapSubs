import { createContext, useState } from 'react';
import { connectWallet } from '../services/wallet.js';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [publicKey, setPublicKey] = useState(null);
    const [error, setError] = useState(null);

    async function connect() {
        try {
            const key = await connectWallet();
            setPublicKey(key);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    }

    function disconnect() {
        setPublicKey(null);
    }

    return (
        <WalletContext.Provider value={{ publicKey, connect, disconnect, error }}>
            {children}
        </WalletContext.Provider>
    );
}


