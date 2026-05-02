import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import {
    getSubscription, pauseSubscription, resumeSubscription,
    cancelSubscription, getPaymentHistory,
    depositFunds, withdrawFunds, payNow
} from '../services/api.js';

function ActionError({ message }) {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function Dashboard({ onSubscriptionChange }) {
    const { publicKey } = useWallet();
    const [subscription, setSubscription] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    // Per-action loading & error state
    const [actionState, setActionState] = useState({});
    const setAction = (key, state) =>
        setActionState(prev => ({ ...prev, [key]: { ...prev[key], ...state } }));

    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const refreshData = useCallback(async () => {
        if (!publicKey) return;
        setLoading(true);
        setFetchError(null);
        try {
            const [sub, pay] = await Promise.all([
                getSubscription(publicKey),
                getPaymentHistory(publicKey),
            ]);
            setSubscription(sub);
            setPayments(pay);
        } catch (err) {
            setFetchError(err.message);
            setSubscription(null);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => { refreshData(); }, [refreshData]);

    // Generic action runner — sets per-key loading + error
    const runAction = async (key, fn) => {
        setAction(key, { loading: true, error: null });
        try {
            await fn();
            await refreshData();
            onSubscriptionChange?.();
        } catch (err) {
            setAction(key, { error: err.message });
        } finally {
            setAction(key, { loading: false });
        }
    };

    const handlePause    = () => runAction('pause',   () => pauseSubscription(publicKey));
    const handleResume   = () => runAction('resume',  () => resumeSubscription(publicKey));
    const handlePayNow   = () => runAction('payNow',  () => payNow(publicKey));
    const handleCancel   = async () => {
        if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
        runAction('cancel', () => cancelSubscription(publicKey));
    };
    const handleDeposit  = () => {
        if (!depositAmount || isNaN(depositAmount) || Number(depositAmount) <= 0) {
            setAction('deposit', { error: 'Enter a valid positive amount.' });
            return;
        }
        runAction('deposit', async () => {
            await depositFunds({ subscriber: publicKey, amount: parseInt(depositAmount) });
            setDepositAmount('');
        });
    };
    const handleWithdraw = () => {
        if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
            setAction('withdraw', { error: 'Enter a valid positive amount.' });
            return;
        }
        runAction('withdraw', async () => {
            await withdrawFunds({ subscriber: publicKey, amount: parseInt(withdrawAmount) });
            setWithdrawAmount('');
        });
    };

    if (!publicKey) return null;

    if (loading) return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading subscription...
            </div>
        </div>
    );

    if (fetchError) return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <p className="text-sm text-red-500 mb-3">{fetchError}</p>
            <button onClick={refreshData} className="text-sm text-indigo-600 underline">Try again</button>
        </div>
    );

    if (!subscription) return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <p className="text-sm text-gray-500">No active subscription found.</p>
        </div>
    );

    const s = actionState;

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full space-y-6">
            <h2 className="text-lg font-semibold text-gray-800">Subscription Overview</h2>

            <div className="flex flex-col gap-2 text-sm text-gray-700">
                <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-medium ${
                        subscription.status === 'Active' ? 'text-green-600' :
                        subscription.status === 'Paused' ? 'text-yellow-600' : 'text-red-500'
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
                    <span className="truncate ml-4 font-mono text-xs">
                        {subscription.merchant.slice(0, 8)}...{subscription.merchant.slice(-6)}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
                <h3 className="text-md font-semibold text-gray-800">Controls</h3>
                <div className="flex gap-2 flex-wrap">
                    {subscription.status === 'Active' && Date.now() / 1000 >= subscription.nextPayment && (
                        <button onClick={handlePayNow} disabled={s.payNow?.loading}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50">
                            {s.payNow?.loading ? 'Processing...' : 'Pay Now'}
                        </button>
                    )}
                    {subscription.status === 'Active' && (
                        <button onClick={handlePause} disabled={s.pause?.loading}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50">
                            {s.pause?.loading ? 'Pausing...' : 'Pause'}
                        </button>
                    )}
                    {subscription.status === 'Paused' && (
                        <button onClick={handleResume} disabled={s.resume?.loading}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                            {s.resume?.loading ? 'Resuming...' : 'Resume'}
                        </button>
                    )}
                    <button onClick={handleCancel} disabled={s.cancel?.loading}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">
                        {s.cancel?.loading ? 'Cancelling...' : 'Cancel'}
                    </button>
                </div>
                <ActionError message={s.pause?.error || s.resume?.error || s.cancel?.error || s.payNow?.error} />
            </div>

            {/* Escrow */}
            <div className="space-y-3">
                <h3 className="text-md font-semibold text-gray-800">Escrow Management</h3>
                <div>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Amount" value={depositAmount}
                            onChange={(e) => { setDepositAmount(e.target.value); setAction('deposit', { error: null }); }}
                            className="flex-1 px-3 py-2 border rounded text-sm" />
                        <button onClick={handleDeposit} disabled={s.deposit?.loading}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm">
                            {s.deposit?.loading ? 'Depositing...' : 'Deposit'}
                        </button>
                    </div>
                    <ActionError message={s.deposit?.error} />
                </div>
                <div>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Amount" value={withdrawAmount}
                            onChange={(e) => { setWithdrawAmount(e.target.value); setAction('withdraw', { error: null }); }}
                            className="flex-1 px-3 py-2 border rounded text-sm" />
                        <button onClick={handleWithdraw} disabled={s.withdraw?.loading}
                            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 text-sm">
                            {s.withdraw?.loading ? 'Withdrawing...' : 'Withdraw'}
                        </button>
                    </div>
                    <ActionError message={s.withdraw?.error} />
                </div>
            </div>

            {/* Payment history */}
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
                                    className="text-blue-500 underline font-mono text-xs">
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