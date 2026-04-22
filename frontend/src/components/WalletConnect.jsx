import { useWallet } from '../context/useWallet.js';

export default function WalletConnect() {
    const { publicKey, connect, disconnect, error, connecting } = useWallet();

    return (
        <div className="flex items-center gap-4">
            {publicKey ? (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 font-mono">
                        {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
                    </span>
                    <button onClick={disconnect}
                        className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                        Disconnect
                    </button>
                </div>
            ) : (
                <button onClick={connect} disabled={connecting}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                    {connecting && (
                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                    )}
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}