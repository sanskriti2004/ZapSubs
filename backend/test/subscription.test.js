import 'dotenv/config';
import { jest } from '@jest/globals';

// ── Mock stellar + notification before any app import ──
jest.unstable_mockModule('../services/notification.service.js', () => ({
    sendNotification: jest.fn().mockResolvedValue({}),
}));

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

// Import app AFTER mocks are registered
const { default: app }          = await import('../app.js');
const { default: Subscription } = await import('../models/subscription.model.js');
const { default: Payment }      = await import('../models/payment.model.js');

const stellar      = await import('../services/stellar.service.cjs');
const notification = await import('../services/notification.service.js');

// ── Test data ──────────────────────────────────────────
const SUBSCRIBER = 'GABC1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234';
const MERCHANT   = 'GXYZ1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF5678';
const BASE_SUB   = { subscriber: SUBSCRIBER, merchant: MERCHANT, amount: 100, interval: 86400 };

// ── DB setup ───────────────────────────────────────────
let mongod;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
    await mongoose.disconnect();
});

afterEach(async () => {
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    jest.clearAllMocks();
});

// ── Helpers ────────────────────────────────────────────
async function seedSubscription(overrides = {}) {
    return Subscription.create({
        subscriber:    SUBSCRIBER,
        merchant:      MERCHANT,
        amount:        100,
        interval:      86400,
        nextPayment:   Math.floor(Date.now() / 1000) + 86400,
        status:        'Active',
        escrowBalance: 0,
        ...overrides,
    });
}

async function seedPayment(overrides = {}) {
    return Payment.create({
        subscriber: SUBSCRIBER,
        merchant:   MERCHANT,
        amount:     100,
        txHash:     'abc123def456',
        status:     'completed',
        ...overrides,
    });
}

// ══════════════════════════════════════════════════════
// POST /api/subscriptions — create
// ══════════════════════════════════════════════════════
describe('POST /api/subscriptions', () => {
    test('201 — creates subscription and returns it', async () => {
        const res = await request(app).post('/api/subscriptions').send(BASE_SUB);

        expect(res.status).toBe(201);
        expect(res.body.subscriber).toBe(SUBSCRIBER);
        expect(res.body.merchant).toBe(MERCHANT);
        expect(res.body.amount).toBe(100);
        expect(res.body.status).toBe('Active');
        expect(res.body.escrowBalance).toBe(0);
        expect(res.body.nextPayment).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('201 — calls stellar initializeSubscription with correct args', async () => {
        await request(app).post('/api/subscriptions').send(BASE_SUB);

        expect(stellar.initializeSubscription).toHaveBeenCalledTimes(1);
        expect(stellar.initializeSubscription).toHaveBeenCalledWith(
            SUBSCRIBER, MERCHANT, 100, 86400
        );
    });

    test('201 — sends notification on create', async () => {
        await request(app).post('/api/subscriptions').send(BASE_SUB);

        expect(notification.sendNotification).toHaveBeenCalledTimes(1);
        expect(notification.sendNotification).toHaveBeenCalledWith(
            SUBSCRIBER,
            'Subscription created',
            expect.stringContaining('100')
        );
    });

    test('500 — when stellar throws, returns error', async () => {
        stellar.initializeSubscription.mockRejectedValueOnce(new Error('Stellar timeout'));

        const res = await request(app).post('/api/subscriptions').send(BASE_SUB);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Stellar timeout');
    });
});

// ══════════════════════════════════════════════════════
// GET /api/subscriptions/:subscriber
// ══════════════════════════════════════════════════════
describe('GET /api/subscriptions/:subscriber', () => {
    test('200 — returns existing subscription', async () => {
        await seedSubscription();

        const res = await request(app).get(`/api/subscriptions/${SUBSCRIBER}`);

        expect(res.status).toBe(200);
        expect(res.body.subscriber).toBe(SUBSCRIBER);
        expect(res.body.status).toBe('Active');
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app).get(`/api/subscriptions/GNOTFOUND`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });
});

// ══════════════════════════════════════════════════════
// PATCH /api/subscriptions/:subscriber/pause
// ══════════════════════════════════════════════════════
describe('PATCH /api/subscriptions/:subscriber/pause', () => {
    test('200 — pauses an active subscription', async () => {
        await seedSubscription({ status: 'Active' });

        const res = await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/pause`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Paused');
    });

    test('200 — calls stellar pauseSubscription', async () => {
        await seedSubscription();

        await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/pause`);

        expect(stellar.pauseSubscription).toHaveBeenCalledWith(SUBSCRIBER);
    });

    test('200 — sends pause notification', async () => {
        await seedSubscription();

        await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/pause`);

        expect(notification.sendNotification).toHaveBeenCalledWith(
            SUBSCRIBER,
            'Subscription paused',
            expect.any(String)
        );
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app).patch(`/api/subscriptions/GNOTFOUND/pause`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });

    test('500 — stellar failure returns error', async () => {
        await seedSubscription();
        stellar.pauseSubscription.mockRejectedValueOnce(new Error('Contract error'));

        const res = await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/pause`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Contract error');
    });
});

// ══════════════════════════════════════════════════════
// PATCH /api/subscriptions/:subscriber/resume
// ══════════════════════════════════════════════════════
describe('PATCH /api/subscriptions/:subscriber/resume', () => {
    test('200 — resumes a paused subscription', async () => {
        await seedSubscription({ status: 'Paused' });

        const res = await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/resume`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Active');
    });

    test('200 — calls stellar resumeSubscription', async () => {
        await seedSubscription({ status: 'Paused' });

        await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/resume`);

        expect(stellar.resumeSubscription).toHaveBeenCalledWith(SUBSCRIBER);
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app).patch(`/api/subscriptions/GNOTFOUND/resume`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });
});

// ══════════════════════════════════════════════════════
// PATCH /api/subscriptions/:subscriber/cancel
// ══════════════════════════════════════════════════════
describe('PATCH /api/subscriptions/:subscriber/cancel', () => {
    test('200 — cancels subscription', async () => {
        await seedSubscription();

        const res = await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/cancel`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Cancelled');
    });

    test('200 — calls stellar cancelSubscription', async () => {
        await seedSubscription();

        await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/cancel`);

        expect(stellar.cancelSubscription).toHaveBeenCalledWith(SUBSCRIBER);
    });

    test('200 — sends cancel notification', async () => {
        await seedSubscription();

        await request(app).patch(`/api/subscriptions/${SUBSCRIBER}/cancel`);

        expect(notification.sendNotification).toHaveBeenCalledWith(
            SUBSCRIBER,
            'Subscription cancelled',
            expect.any(String)
        );
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app).patch(`/api/subscriptions/GNOTFOUND/cancel`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });
});

// ══════════════════════════════════════════════════════
// POST /api/subscriptions/:subscriber/deposit
// ══════════════════════════════════════════════════════
describe('POST /api/subscriptions/:subscriber/deposit', () => {
    test('200 — increments escrow balance', async () => {
        await seedSubscription({ escrowBalance: 50 });

        const res = await request(app)
            .post(`/api/subscriptions/${SUBSCRIBER}/deposit`)
            .send({ subscriber: SUBSCRIBER, amount: 100 });

        expect(res.status).toBe(200);
        expect(res.body.escrowBalance).toBe(150);
    });

    test('200 — calls stellar depositToEscrow', async () => {
        await seedSubscription();

        await request(app)
            .post(`/api/subscriptions/${SUBSCRIBER}/deposit`)
            .send({ subscriber: SUBSCRIBER, amount: 100 });

        expect(stellar.depositToEscrow).toHaveBeenCalledWith(SUBSCRIBER, 100);
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app)
            .post(`/api/subscriptions/GNOTFOUND/deposit`)
            .send({ subscriber: 'GNOTFOUND', amount: 100 });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });

    test('500 — stellar failure returns error', async () => {
        await seedSubscription();
        stellar.depositToEscrow.mockRejectedValueOnce(new Error('Escrow failed'));

        const res = await request(app)
            .post(`/api/subscriptions/${SUBSCRIBER}/deposit`)
            .send({ subscriber: SUBSCRIBER, amount: 100 });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Escrow failed');
    });
});

// ══════════════════════════════════════════════════════
// POST /api/subscriptions/:subscriber/withdraw
// ══════════════════════════════════════════════════════
describe('POST /api/subscriptions/:subscriber/withdraw', () => {
    test('200 — decrements escrow balance', async () => {
        await seedSubscription({ escrowBalance: 200 });

        const res = await request(app)
            .post(`/api/subscriptions/${SUBSCRIBER}/withdraw`)
            .send({ subscriber: SUBSCRIBER, amount: 50 });

        expect(res.status).toBe(200);
        expect(res.body.escrowBalance).toBe(150);
    });

    test('200 — calls stellar withdrawFromEscrow', async () => {
        await seedSubscription({ escrowBalance: 200 });

        await request(app)
            .post(`/api/subscriptions/${SUBSCRIBER}/withdraw`)
            .send({ subscriber: SUBSCRIBER, amount: 50 });

        expect(stellar.withdrawFromEscrow).toHaveBeenCalledWith(SUBSCRIBER, 50);
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app)
            .post(`/api/subscriptions/GNOTFOUND/withdraw`)
            .send({ subscriber: 'GNOTFOUND', amount: 50 });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });
});

// ══════════════════════════════════════════════════════
// POST /api/subscriptions/:subscriber/pay
// ══════════════════════════════════════════════════════
describe('POST /api/subscriptions/:subscriber/pay', () => {
    test('200 — returns success message', async () => {
        await seedSubscription();

        const res = await request(app).post(`/api/subscriptions/${SUBSCRIBER}/pay`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Payment executed');
    });

    test('200 — advances nextPayment by interval', async () => {
        const originalNext = Math.floor(Date.now() / 1000) + 86400;
        await seedSubscription({ nextPayment: originalNext, interval: 86400 });

        await request(app).post(`/api/subscriptions/${SUBSCRIBER}/pay`);

        const updated = await Subscription.findOne({ subscriber: SUBSCRIBER });
        expect(updated.nextPayment).toBe(originalNext + 86400);
    });

    test('200 — calls stellar executePayment', async () => {
        await seedSubscription();

        await request(app).post(`/api/subscriptions/${SUBSCRIBER}/pay`);

        expect(stellar.executePayment).toHaveBeenCalledTimes(1);
    });

    test('404 — subscriber not found', async () => {
        const res = await request(app).post(`/api/subscriptions/GNOTFOUND/pay`);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Subscription not found');
    });

    test('500 — stellar failure returns error', async () => {
        await seedSubscription();
        stellar.executePayment.mockRejectedValueOnce(new Error('Payment failed on chain'));

        const res = await request(app).post(`/api/subscriptions/${SUBSCRIBER}/pay`);

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Payment failed on chain');
    });
});

// ══════════════════════════════════════════════════════
// GET /api/subscriptions/:subscriber/payments
// ══════════════════════════════════════════════════════
describe('GET /api/subscriptions/:subscriber/payments', () => {
    test('200 — returns empty array when no payments', async () => {
        const res = await request(app).get(`/api/subscriptions/${SUBSCRIBER}/payments`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('200 — returns payments sorted newest first', async () => {
        await seedPayment({ amount: 100, txHash: 'hash1' });
        // small delay so createdAt timestamps differ
        await new Promise(r => setTimeout(r, 10));
        await seedPayment({ amount: 200, txHash: 'hash2' });

        const res = await request(app).get(`/api/subscriptions/${SUBSCRIBER}/payments`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].amount).toBe(200); // newest first
        expect(res.body[1].amount).toBe(100);
    });

    test('200 — only returns payments for the given subscriber', async () => {
        await seedPayment({ subscriber: SUBSCRIBER, txHash: 'hash1' });
        await seedPayment({ subscriber: 'GOTHER000000000000000000000000000000000000000000000000', txHash: 'hash2' });

        const res = await request(app).get(`/api/subscriptions/${SUBSCRIBER}/payments`);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].subscriber).toBe(SUBSCRIBER);
    });
});