import { useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { createSubscription } from '../services/api.js';

export default function SubscriptionForm() {
    const { publicKey } = useWallet();
    const [form, setForm] = useState({ merchant: '', amount: '', interval: '' });
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!publicKey) {
            setStatus({ type: 'error', message: 'Please connect your wallet first.' });
            return;
        }
        if (!form.merchant || !form.amount || !form.interval) {
            setStatus({ type: 'error', message: 'All fields are required.' });
            return;
        }
        if (isNaN(form.amount) || Number(form.amount) <= 0) {
            setStatus({ type: 'error', message: 'Amount must be a positive number.' });
            return;
        }

        setLoading(true);
        try {
            await createSubscription({
                subscriber: publicKey,
                merchant: form.merchant,
                amount: Number(form.amount),
                interval: Number(form.interval),
            });
            setStatus({ type: 'success', message: 'Subscription created successfully.' });
            setForm({ merchant: '', amount: '', interval: '' });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Something went wrong.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Subscription</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Merchant Address</label>
                    <input
                        name="merchant"
                        value={form.merchant}
                        onChange={handleChange}
                        placeholder="G..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount (XLM)</label>
                    <input
                        name="amount"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="100"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Interval (seconds)</label>
                    <input
                        name="interval"
                        value={form.interval}
                        onChange={handleChange}
                        placeholder="86400 for daily"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>
                {status && (
                    <p className={`text-sm ${status.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                        {status.message}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Create Subscription'}
                </button>
            </form>
        </div>
    );
}
