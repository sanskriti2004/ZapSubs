import { useWallet } from '../context/useWallet.js';

export default function WalletConnect() {
    const { publicKey, connect, disconnect, error, connecting, isConnected } = useWallet();

    const handleDisconnect = () => {
        if (window.confirm('Disconnect from wallet?')) {
            disconnect();
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4">
                {isConnected ? (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-sm text-gray-600 font-mono">
                                {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
                            </span>
                        </div>
                        <button
                            onClick={handleDisconnect}
                            className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                        >
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={connect}
                        disabled={connecting}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition"
                    >
                        {connecting && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        )}
                        <span>{connecting ? 'Connecting...' : 'Connect Wallet'}</span>
                    </button>
                )}
            </div>
            {error && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                    <span className="text-lg leading-none">⚠️</span>
                    <div>
                        <p className="font-medium">Connection Error</p>
                        <p className="text-xs text-red-500">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}