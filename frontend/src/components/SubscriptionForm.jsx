import { useState } from 'react';
import { useWallet } from '../context/useWallet.js';
import { createSubscription, ApiError } from '../services/api.js';

const validateMerchantAddress = (addr) => /^G[A-Z0-9]{55}$/.test(addr);
const validateAmount = (val) => !isNaN(val) && Number(val) > 0 && Number(val) <= 922337203;
const validateInterval = (val) => !isNaN(val) && Number(val) > 0;

export default function SubscriptionForm() {
    const { publicKey } = useWallet();
    const [form, setForm] = useState({ merchant: '', amount: '', interval: '' });
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    function handleChange(e) {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        if (fieldErrors[name]) {
            setFieldErrors({ ...fieldErrors, [name]: '' });
        }
    }

    function validateForm() {
        const errors = {};
        if (!publicKey) {
            setStatus({ type: 'error', message: 'Please connect your wallet first.' });
            return false;
        }
        if (!form.merchant) errors.merchant = 'Merchant address is required';
        else if (!validateMerchantAddress(form.merchant)) errors.merchant = 'Invalid Stellar address';
        
        if (!form.amount) errors.amount = 'Amount is required';
        else if (!validateAmount(form.amount)) errors.amount = 'Amount must be between 0 and 922337203 XLM';
        
        if (!form.interval) errors.interval = 'Interval is required';
        else if (!validateInterval(form.interval)) errors.interval = 'Interval must be a positive number (seconds)';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return false;
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setStatus(null);
        try {
            const result = await createSubscription({
                subscriber: publicKey,
                merchant: form.merchant,
                amount: Number(form.amount),
                interval: Number(form.interval),
            });
            setStatus({
                type: 'success',
                message: `Subscription created! Contract ID: ${result.contractId?.slice(0, 16)}...`
            });
            setForm({ merchant: '', amount: '', interval: '' });
            setFieldErrors({});
            // Auto-hide success after 5 seconds
            setTimeout(() => setStatus(null), 5000);
        } catch (err) {
            const message = err instanceof ApiError
                ? err.message
                : 'Failed to create subscription. Please try again.';
            setStatus({ type: 'error', message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Subscription</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Merchant Address Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Merchant Address
                    </label>
                    <input
                        name="merchant"
                        value={form.merchant}
                        onChange={handleChange}
                        placeholder="G..."
                        maxLength="56"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                            fieldErrors.merchant
                                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                                : 'border-gray-200 focus:ring-indigo-400'
                        }`}
                    />
                    {fieldErrors.merchant && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.merchant}</p>
                    )}
                </div>

                {/* Amount Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (XLM)
                    </label>
                    <input
                        name="amount"
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="100"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                            fieldErrors.amount
                                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                                : 'border-gray-200 focus:ring-indigo-400'
                        }`}
                    />
                    {fieldErrors.amount && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.amount}</p>
                    )}
                </div>

                {/* Interval Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interval (seconds)
                    </label>
                    <input
                        name="interval"
                        type="number"
                        value={form.interval}
                        onChange={handleChange}
                        placeholder="86400 (daily)"
                        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
                            fieldErrors.interval
                                ? 'border-red-300 bg-red-50 focus:ring-red-400'
                                : 'border-gray-200 focus:ring-indigo-400'
                        }`}
                    />
                    {fieldErrors.interval && (
                        <p className="text-xs text-red-600 mt-1">{fieldErrors.interval}</p>
                    )}
                </div>

                {/* Status Message */}
                {status && (
                    <div
                        role="alert"
                        className={`rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${
                            status.type === 'error'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-green-50 text-green-700 border border-green-200'
                        }`}
                    >
                        <span className="text-lg leading-none">
                            {status.type === 'error' ? '✕' : '✓'}
                        </span>
                        <span>{status.message}</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !publicKey}
                    className={`py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 ${
                        loading || !publicKey
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {loading && (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                    )}
                    <span>{loading ? 'Creating...' : 'Create Subscription'}</span>
                </button>

                {!publicKey && (
                    <p className="text-sm text-gray-500 text-center">Connect your wallet to create a subscription</p>
                )}
            </form>
        </div>
    );
}
