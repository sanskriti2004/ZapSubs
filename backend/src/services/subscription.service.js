import Subscription from '../models/subscription.model.js';
import Payment from '../models/payment.model.js';
import { sendNotification } from './notification.service.js';

export async function createSubscription(req, res) {
    try {
        const { subscriber, merchant, amount, interval, contractId } = req.body;

        const nextPayment = Math.floor(Date.now() / 1000) + interval;

        const subscription = await Subscription.create({
            subscriber,
            merchant,
            amount,
            interval,
            nextPayment,
            contractId,
        });

        await sendNotification(subscriber, 'Subscription created', `Your subscription of ${amount} every ${interval}s is now active.`);

        res.status(201).json(subscription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getSubscription(req, res) {
    try {
        const subscription = await Subscription.findOne({ subscriber: req.params.subscriber });
        if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
        res.json(subscription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function pauseSubscription(req, res) {
    try {
        const subscription = await Subscription.findOneAndUpdate(
            { subscriber: req.params.subscriber },
            { status: 'Paused' },
            { new: true }
        );
        if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

        await sendNotification(subscription.subscriber, 'Subscription paused', 'Your subscription has been paused.');

        res.json(subscription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function resumeSubscription(req, res) {
    try {
        const subscription = await Subscription.findOneAndUpdate(
            { subscriber: req.params.subscriber },
            { status: 'Active' },
            { new: true }
        );
        if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

        await sendNotification(subscription.subscriber, 'Subscription resumed', 'Your subscription is active again.');

        res.json(subscription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function cancelSubscription(req, res) {
    try {
        const subscription = await Subscription.findOneAndUpdate(
            { subscriber: req.params.subscriber },
            { status: 'Cancelled' },
            { new: true }
        );
        if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

        await sendNotification(subscription.subscriber, 'Subscription cancelled', 'Your subscription has been cancelled.');

        res.json(subscription);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getPaymentHistory(req, res) {
    try {
        const payments = await Payment.find({ subscriber: req.params.subscriber }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
