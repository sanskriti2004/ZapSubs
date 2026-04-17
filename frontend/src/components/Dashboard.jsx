import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/useWallet.js';
import {
    getSubscription, pauseSubscription, resumeSubscription,
    cancelSubscription, getPaymentHistory, depositFunds,
    withdrawFunds, payNow
} from '../services/api.js';

export default function Dashboard() {
    const { publicKey } = useWallet();
    const [subscription, setSubscription] = useState(null);
    const [payments, setPayments]         = useState([]);
    const [loading, setLoading]           = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [error, setError]               = useState(null);      // ← replaces alert()
    const [confirmCancel, setConfirmCancel] = useState(false);   // ← replaces confirm()

    const refreshData = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        setError(null);
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

    useEffect(() => { refreshData(); }, [refreshData]);

    // Generic action wrapper — eliminates repetitive try/catch
    async function runAction(fn, errMsg) {
        setActionLoading(true);
        setError(null);
        try {
            await fn();
            await refreshData();
        } catch (err) {
            setError(err?.response?.data?.error || errMsg);
        } finally {
            setActionLoading(false);
        }
    }

    const handlePause    = () => runAction(() => pauseSubscription(publicKey), 'Failed to pause subscription.');
    const handleResume   = () => runAction(() => resumeSubscription(publicKey), 'Failed to resume subscription.');
    const handlePayNow   = () => runAction(() => payNow(publicKey), 'Failed to execute payment.');

    const handleCancel = async () => {
        if (!confirmCancel) { setConfirmCancel(true); return; } // first click = ask
        setConfirmCancel(false);
        runAction(() => cancelSubscription(publicKey), 'Failed to cancel subscription.');
    };

    const handleDeposit = () => {
        if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
            setError('Enter a valid deposit amount.');
            return;
        }
        runAction(
            () => depositFunds({ subscriber: publicKey, amount: parseInt(depositAmount) }),
            'Failed to deposit funds.'
        ).then(() => setDepositAmount(''));
    };

    const handleWithdraw = () => {
        if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
            setError('Enter a valid withdrawal amount.');
            return;
        }
        runAction(
            () => withdrawFunds({ subscriber: publicKey, amount: parseInt(withdrawAmount) }),
            'Failed to withdraw funds.'
        ).then(() => setWithdrawAmount(''));
    };

    if (!publicKey) return null;

    if (loading) return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading subscription...
            </div>
        </div>
    );

    if (!subscription) return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full text-sm text-gray-500">
            No active subscription found.
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Subscription Overview</h2>

            {/* ── Inline error banner ── */}
            {error && (
                <div className="flex items-start justify-between bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
                </div>
            )}

            {/* ── Subscription details ── */}
            <div className="flex flex-col gap-2 text-sm text-gray-700">
                <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${
                        subscription.status === 'Active'  ? 'text-green-600' :
                        subscription.status === 'Paused'  ? 'text-yellow-600' : 'text-red-500'
                    }`}>{subscription.status}</span>
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
                    <span className="truncate ml-4">
                        {subscription.merchant.slice(0, 8)}...{subscription.merchant.slice(-6)}
                    </span>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="space-y-3">
                <h3 className="text-md font-semibold text-gray-800">Controls</h3>
                <div className="flex gap-2 flex-wrap">
                    {subscription.status === 'Active' && Date.now() / 1000 >= subscription.nextPayment && (
                        <button onClick={handlePayNow} disabled={actionLoading}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm">
                            {actionLoading ? '...' : 'Pay Now'}
                        </button>
                    )}
                    {subscription.status === 'Active' && (
                        <button onClick={handlePause} disabled={actionLoading}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 text-sm">
                            {actionLoading ? '...' : 'Pause'}
                        </button>
                    )}
                    {subscription.status === 'Paused' && (
                        <button onClick={handleResume} disabled={actionLoading}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm">
                            {actionLoading ? '...' : 'Resume'}
                        </button>
                    )}
                    {/* Two-step cancel confirmation — no browser confirm() */}
                    {confirmCancel ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600">Sure?</span>
                            <button onClick={handleCancel} disabled={actionLoading}
                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50">
                                Yes, cancel
                            </button>
                            <button onClick={() => setConfirmCancel(false)}
                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
                                No
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleCancel} disabled={actionLoading}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm">
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* ── Escrow Management ── */}
            <div className="space-y-3">
                <h3 className="text-md font-semibold text-gray-800">Escrow Management</h3>
                <div className="flex gap-2">
                    <input type="number" placeholder="Amount" value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={handleDeposit} disabled={actionLoading}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm">
                        Deposit
                    </button>
                </div>
                <div className="flex gap-2">
                    <input type="number" placeholder="Amount" value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={handleWithdraw} disabled={actionLoading}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">
                        Withdraw
                    </button>
                </div>
            </div>

            {/* ── Payment History ── */}
            <div className="space-y-3">
                <h3 className="text-md font-semibold text-gray-800">Payment History</h3>
                {payments.length === 0 ? (
                    <p className="text-sm text-gray-500">No payments yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {payments.map((payment, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                                <span>{payment.amount} XLM</span>
                                <a href={`https://stellar.expert/explorer/testnet/tx/${payment.txHash}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="text-blue-500 underline">
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