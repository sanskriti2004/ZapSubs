import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { getSubscription, pauseSubscription, resumeSubscription, cancelSubscription, getPaymentHistory, depositFunds, withdrawFunds, payNow } from '../services/api.js';

export default function Dashboard() {
    const { publicKey } = useWallet();
    const [subscription, setSubscription] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const refreshData = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        try {
            const sub = await getSubscription(publicKey);
            setSubscription(sub);
            const pay = await getPaymentHistory(publicKey);
            setPayments(pay);
        } catch {
            setSubscription(null);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handlePause = async () => {
        setActionLoading(true);
        try {
            await pauseSubscription(publicKey);
            await refreshData();
        } catch {
            alert('Failed to pause subscription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleResume = async () => {
        setActionLoading(true);
        try {
            await resumeSubscription(publicKey);
            await refreshData();
        } catch {
            alert('Failed to resume subscription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription?')) return;
        setActionLoading(true);
        try {
            await cancelSubscription(publicKey);
            await refreshData();
        } catch {
            alert('Failed to cancel subscription');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeposit = async () => {
        if (!depositAmount || isNaN(depositAmount)) return;
        setActionLoading(true);
        try {
            await depositFunds({ subscriber: publicKey, amount: parseInt(depositAmount) });
            setDepositAmount('');
            await refreshData();
        } catch {
            alert('Failed to deposit funds');
        } finally {
            setActionLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || isNaN(withdrawAmount)) return;
        setActionLoading(true);
        try {
            await withdrawFunds({ subscriber: publicKey, amount: parseInt(withdrawAmount) });
            setWithdrawAmount('');
            await refreshData();
        } catch {
            alert('Failed to withdraw funds');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayNow = async () => {
        setActionLoading(true);
        try {
            await payNow(publicKey);
            await refreshData();
        } catch {
            alert('Failed to execute payment');
        } finally {
            setActionLoading(false);
        }
    };

    if (!publicKey) return null;
    if (loading) return <p className="text-sm text-gray-500">Loading subscription...</p>;
    if (!subscription) return <p className="text-sm text-gray-500">No active subscription found.</p>;

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Subscription Overview</h2>
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

            <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">Controls</h3>
                <div className="flex gap-2 flex-wrap">
                    {subscription.status === 'Active' && Date.now() / 1000 >= subscription.nextPayment && (
                        <button onClick={handlePayNow} disabled={actionLoading} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50">
                            Pay Now
                        </button>
                    )}
                    {subscription.status === 'Active' && (
                        <button onClick={handlePause} disabled={actionLoading} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50">
                            Pause
                        </button>
                    )}
                    {subscription.status === 'Paused' && (
                        <button onClick={handleResume} disabled={actionLoading} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                            Resume
                        </button>
                    )}
                    <button onClick={handleCancel} disabled={actionLoading} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">
                        Cancel
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">Escrow Management</h3>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                    />
                    <button onClick={handleDeposit} disabled={actionLoading} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                        Deposit
                    </button>
                </div>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded"
                    />
                    <button onClick={handleWithdraw} disabled={actionLoading} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50">
                        Withdraw
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-md font-semibold text-gray-800">Payment History</h3>
                {payments.length === 0 ? (
                    <p className="text-sm text-gray-500">No payments yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {payments.map((payment, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                                <span>{payment.amount} XLM</span>
                                <a href={`https://stellar.expert/explorer/testnet/tx/${payment.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                    {payment.txHash.slice(0, 8)}...
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
