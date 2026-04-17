import { useWallet } from '../context/useWallet.js';

export default function WalletConnect() {
    const { publicKey, connect, disconnect, error } = useWallet();

    return (
        <div className="flex items-center gap-4">
            {publicKey ? (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                        {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
                    </span>
                    <button
                        onClick={disconnect}
                        className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <button
                    onClick={connect}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Connect Wallet
                </button>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
