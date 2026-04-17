import { useState, useEffect, useCallback, useRef } from 'react';
import { getSubscription, getPaymentHistory } from './api.js';

/**
 * Custom hook for polling subscription status
 * Useful for monitoring transaction progress
 */
export function useSubscriptionPolling(publicKey, interval = 5000, enabled = true) {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);

    const poll = useCallback(async () => {
        if (!publicKey || !enabled) return;
        setLoading(true);
        try {
            const data = await getSubscription(publicKey);
            setSubscription(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [publicKey, enabled]);

    useEffect(() => {
        // Initial poll
        poll();

        // Set up interval if enabled
        if (enabled) {
            pollIntervalRef.current = setInterval(poll, interval);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [poll, interval, enabled]);

    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(poll, interval);
    }, [poll, interval]);

    return { subscription, loading, error, poll, stopPolling, startPolling };
}

/**
 * Custom hook for polling payment history
 */
export function usePaymentHistoryPolling(publicKey, interval = 5000, enabled = true) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const pollIntervalRef = useRef(null);
    const previousCountRef = useRef(0);

    const poll = useCallback(async () => {
        if (!publicKey || !enabled) return;
        setLoading(true);
        try {
            const data = await getPaymentHistory(publicKey);
            setPayments(data || []);
            
            // Notify if new payment detected
            if ((data?.length || 0) > previousCountRef.current) {
                previousCountRef.current = data?.length || 0;
            }
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [publicKey, enabled]);

    useEffect(() => {
        // Initial poll
        poll();

        // Set up interval if enabled
        if (enabled) {
            pollIntervalRef.current = setInterval(poll, interval);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [poll, interval, enabled]);

    return { payments, loading, error, poll };
}

/**
 * Hook for managing transaction status with timeout and retry logic
 */
export function useTransactionStatus(initialStatus = 'pending') {
    const [status, setStatus] = useState(initialStatus);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const timeoutRef = useRef(null);

    const updateStatus = useCallback((newStatus, msg = '', prog = 0) => {
        setStatus(newStatus);
        setMessage(msg);
        setProgress(prog);
    }, []);

    const startProgress = useCallback(() => {
        updateStatus('processing', 'Processing transaction...', 30);
        setTimeout(() => setProgress(60), 500);
        setTimeout(() => setProgress(90), 1500);
    }, [updateStatus]);

    const succeed = useCallback(() => {
        updateStatus('success', 'Transaction completed!', 100);
    }, [updateStatus]);

    const fail = useCallback((error) => {
        updateStatus('failed', error || 'Transaction failed', 0);
    }, [updateStatus]);

    const reset = useCallback(() => {
        setStatus('pending');
        setProgress(0);
        setMessage('');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return { status, progress, message, updateStatus, startProgress, succeed, fail, reset };
}
