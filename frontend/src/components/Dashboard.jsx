import { useEffect, useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { getSubscription } from '../services/api.js';

export default function Dashboard() {
    const { publicKey } = useWallet();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) return;
        setLoading(true);
        getSubscription(publicKey)
            .then(setSubscription)
            .catch(() => setSubscription(null))
            .finally(() => setLoading(false));
    }, [publicKey]);

    if (!publicKey) return null;
    if (loading) return <p className="text-sm text-gray-500">Loading subscription...</p>;
    if (!subscription) return <p className="text-sm text-gray-500">No active subscription found.</p>;

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscription Overview</h2>
            <div className="flex flex-col gap-2 text-sm text-gray-700">
                <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${subscription.status === 'Active' ? 'text-green-600' : subscription.status === 'Paused' ? 'text-yellow-600' : 'text-red-500'}`}>
                        {subscription.status}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span>{subscription.amount} XLM</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Escrow Balance</span>
                    <span>{subscription.escrowBalance} XLM</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Next Payment</span>
                    <span>{new Date(subscription.nextPayment * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Merchant</span>
                    <span className="truncate ml-4">{subscription.merchant.slice(0, 8)}...{subscription.merchant.slice(-6)}</span>
                </div>
            </div>
        </div>
    );
}
