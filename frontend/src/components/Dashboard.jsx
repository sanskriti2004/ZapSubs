import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/useWallet.js';
import { ApiError,
    getSubscription, pauseSubscription, resumeSubscription,
    cancelSubscription, getPaymentHistory, depositFunds,
    withdrawFunds, payNow
} from '../services/api.js';

// Fetch status indicators
const STATUS_COLORS = {
    'Active': 'text-green-600 bg-green-50',
    'Paused': 'text-yellow-600 bg-yellow-50',
    'Cancelled': 'text-red-600 bg-red-50'
};

const PAYMENT_STATUS_COLORS = {
    'success': 'text-green-600',
    'failed': 'text-red-600',
    'pending': 'text-yellow-600'
};

export default function Dashboard() {
    const { publicKey } = useWallet();
    const [subscription, setSubscription] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // Track which action is loading
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [error, setError] = useState(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const refreshData = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        setError(null);
        try {
            const sub = await getSubscription(publicKey);
            setSubscription(sub);
            const pay = await getPaymentHistory(publicKey);
            setPayments(pay || []);
            setLastRefresh(new Date().toLocaleTimeString());
        } catch (err) {
            const message = err instanceof ApiError
                ? err.message
                : 'Failed to load subscription data';
            setError(message);
            setSubscription(null);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    // Auto-refresh every 30 seconds if enabled
    useEffect(() => {
        if (!autoRefresh || !publicKey) return;
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, publicKey, refreshData]);

    // Initial load
    useEffect(() => {
        refreshData();
    }, [refreshData]);

    // Generic action wrapper with proper error handling
    async function runAction(actionKey, fn, errMsg) {
        setActionLoading(actionKey);
        setError(null);
        try {
            await fn();
            // Refresh data after successful action
            await new Promise(r => setTimeout(r, 500));
            await refreshData();
        } catch (err) {
            const message = err instanceof ApiError ? err.message : errMsg;
            // Check if it's a blockchain-related error (timeout, network)
            if (message.includes('timeout') || message.includes('network')) {
                setError(`${message} - Transaction may still be processing. Please refresh to check status.`);
            } else {
                setError(message);
            }
        } finally {
            setActionLoading(null);
        }
    }

    const handlePause = () => runAction('pause', () => pauseSubscription(publicKey), 'Failed to pause subscription');
    const handleResume = () => runAction('resume', () => resumeSubscription(publicKey), 'Failed to resume subscription');
    const handlePayNow = () => runAction('pay', () => payNow(publicKey), 'Failed to execute payment');

    const handleCancel = async () => {
        if (!confirmCancel) {
            setConfirmCancel(true);
            return;
        }
        setConfirmCancel(false);
        runAction('cancel', () => cancelSubscription(publicKey), 'Failed to cancel subscription');
    };

    const validateAmount = (amount) => {
        const num = Number(amount);
        return num > 0 && num <= 922337203;
    };

    const handleDeposit = () => {
        if (!depositAmount || !validateAmount(depositAmount)) {
            setError('Enter a valid deposit amount (max 922337203 XLM)');
            return;
        }
        runAction(
            'deposit',
            () => depositFunds({ subscriber: publicKey, amount: Number(depositAmount) }),
            'Failed to deposit funds'
        ).then(() => setDepositAmount(''));
    };

    const handleWithdraw = () => {
        if (!withdrawAmount || !validateAmount(withdrawAmount)) {
            setError('Enter a valid withdrawal amount');
            return;
        }
        runAction(
            'withdraw',
            () => withdrawFunds({ subscriber: publicKey, amount: Number(withdrawAmount) }),
            'Failed to withdraw funds'
        ).then(() => setWithdrawAmount(''));
    };

    if (!publicKey) return null;

    if (loading && !subscription) {
        return (
            <div className="bg-white rounded-xl shadow p-6 max-w-2xl w-full">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                    <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Loading your subscription...</span>
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="bg-white rounded-xl shadow p-6 max-w-2xl w-full">
                <div className="text-center">
                    <p className="text-gray-600 font-medium mb-3">No active subscription found</p>
                    {error && (
                        <p className="text-sm text-red-600 mb-3">{error}</p>
                    )}
                    <button
                        onClick={refreshData}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl w-full space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Subscription Overview</h2>
                <div className="flex items-center gap-2">
                    {loading && <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>}
                    <button
                        onClick={refreshData}
                        disabled={loading}
                        title="Refresh subscription data"
                        className="p-2 hover:bg-gray-100 rounded transition"
                    >
                        ↻
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    <div className="flex items-start gap-2">
                        <span className="text-lg leading-none">⚠️</span>
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-600 font-bold flex-shrink-0"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Subscription Details */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Status</p>
                    <p className={`text-lg font-semibold px-2 py-1 rounded text-center ${STATUS_COLORS[subscription.status]}`}>
                        {subscription.status}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Monthly Amount</p>
                    <p className="text-lg font-bold text-gray-800">{subscription.amount} XLM</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Escrow Balance</p>
                    <p className="text-lg font-bold text-blue-600">{subscription.escrowBalance} XLM</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Next Payment</p>
                    <p className="text-lg font-bold text-gray-800">
                        {subscription.nextPayment ? new Date(subscription.nextPayment * 1000).toLocaleDateString() : 'N/A'}
                    </p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Merchant Address</p>
                <p className="text-sm font-mono bg-white rounded px-3 py-2 break-words">{subscription.merchant}</p>
            </div>

            {/* Controls Section */}
            <div className="space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span>⚙️ Actions</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                    {subscription.status === 'Active' && (
                        <>
                            {Date.now() / 1000 >= subscription.nextPayment && (
                                <button
                                    onClick={handlePayNow}
                                    disabled={actionLoading === 'pay'}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
                                >
                                    {actionLoading === 'pay' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>}
                                    Pay Now
                                </button>
                            )}
                            <button
                                onClick={handlePause}
                                disabled={actionLoading === 'pause'}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
                            >
                                {actionLoading === 'pause' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>}
                                Pause
                            </button>
                        </>
                    )}

                    {subscription.status === 'Paused' && (
                        <button
                            onClick={handleResume}
                            disabled={actionLoading === 'resume'}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
                        >
                            {actionLoading === 'resume' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>}
                            Resume
                        </button>
                    )}

                    {confirmCancel ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-red-600 font-medium">Confirm cancel?</span>
                            <button
                                onClick={handleCancel}
                                disabled={actionLoading === 'cancel'}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition"
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => setConfirmCancel(false)}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition"
                            >
                                No
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleCancel}
                            disabled={actionLoading === 'cancel'}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition flex items-center gap-2"
                        >
                            {actionLoading === 'cancel' && <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>}
                            Cancel Subscription
                        </button>
                    )}
                </div>
            </div>

            {/* Escrow Management */}
            <div className="space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span>💰 Manage Escrow</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Amount"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                            onClick={handleDeposit}
                            disabled={actionLoading === 'deposit'}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition"
                        >
                            Deposit
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Amount"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                        />
                        <button
                            onClick={handleWithdraw}
                            disabled={actionLoading === 'withdraw'}
                            className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition"
                        >
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="space-y-3 border-t pt-6">
                <h3 className="text-sm font-semibold text-gray-800">📋 Payment History</h3>
                {payments.length === 0 ? (
                    <p className="text-sm text-gray-500">No payments yet.</p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {payments.map((payment, index) => (
                            <div key={index} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition">
                                <div className="flex-1">
                                    <p className="text-gray-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-medium">{payment.amount} XLM</span>
                                    <span className={`text-xs font-semibold ${PAYMENT_STATUS_COLORS[payment.status] || 'text-gray-600'}`}>
                                        {payment.status}
                                    </span>
                                    {payment.txHash && (
                                        <a
                                            href={`https://stellar.expert/explorer/testnet/tx/${payment.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 text-xs font-mono"
                                        >
                                            {payment.txHash.slice(0, 10)}...
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer with refresh time */}
            {lastRefresh && (
                <p className="text-xs text-gray-400 text-center pt-2 border-t">
                    Last updated: {lastRefresh}
                </p>
            )}
        </div>
    );
}