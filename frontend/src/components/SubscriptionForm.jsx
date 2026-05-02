import { useState } from 'react';
import { useWallet } from '../context/WalletContext.jsx';
import { createSubscription } from '../services/api.js';

export default function SubscriptionForm({ onSuccess }) {
    const { publicKey } = useWallet();
    const [form, setForm] = useState({ merchant: '', amount: '', interval: '' });
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
        // Clear field error on change
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    }

    function validate() {
        const e = {};
        if (!form.merchant.trim()) e.merchant = 'Merchant address is required.';
        else if (!form.merchant.startsWith('G') || form.merchant.length < 56)
            e.merchant = 'Enter a valid Stellar address (starts with G, 56 chars).';
        if (!form.amount) e.amount = 'Amount is required.';
        else if (isNaN(form.amount) || Number(form.amount) <= 0)
            e.amount = 'Amount must be a positive number.';
        if (!form.interval) e.interval = 'Interval is required.';
        else if (isNaN(form.interval) || Number(form.interval) <= 0)
            e.interval = 'Interval must be a positive number of seconds.';
        return e;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null); // always clear previous status on new attempt

        if (!publicKey) {
            setStatus({ type: 'error', message: 'Please connect your wallet first.' });
            return;
        }

        const fieldErrors = validate();
        if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
        }

        setLoading(true);
        try {
            await createSubscription({
                subscriber: publicKey,
                merchant: form.merchant.trim(),
                amount: Number(form.amount),
                interval: Number(form.interval),
            });
            setStatus({ type: 'success', message: 'Subscription created successfully!' });
            setForm({ merchant: '', amount: '', interval: '' });
            setErrors({});
            onSuccess?.(); // tell App.jsx to refresh Dashboard
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Subscription</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Merchant Address</label>
                    <input name="merchant" value={form.merchant} onChange={handleChange}
                        placeholder="G..."
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            errors.merchant ? 'border-red-400' : 'border-gray-200'
                        }`} />
                    {errors.merchant && <p className="text-xs text-red-500 mt-1">{errors.merchant}</p>}
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Amount (XLM)</label>
                    <input name="amount" value={form.amount} onChange={handleChange}
                        placeholder="100" type="number" min="0"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            errors.amount ? 'border-red-400' : 'border-gray-200'
                        }`} />
                    {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                </div>
                <div>
                    <label className="block text-sm text-gray-600 mb-1">Interval (seconds)</label>
                    <input name="interval" value={form.interval} onChange={handleChange}
                        placeholder="86400 for daily" type="number" min="0"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            errors.interval ? 'border-red-400' : 'border-gray-200'
                        }`} />
                    {errors.interval && <p className="text-xs text-red-500 mt-1">{errors.interval}</p>}
                </div>
                {status && (
                    <p className={`text-sm rounded px-3 py-2 ${
                        status.type === 'error'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-700'
                    }`}>
                        {status.message}
                    </p>
                )}
                <button type="submit" disabled={loading}
                    className="bg-indigo-600 text-white rounded-lg py-2 text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading && (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                    )}
                    {loading ? 'Creating...' : 'Create Subscription'}
                </button>
            </form>
        </div>
    );
}