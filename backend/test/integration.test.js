import request from 'supertest';
import app from '../src/app.js';
import Subscription from '../src/models/subscription.model.js';
import Payment from '../src/models/payment.model.js';

describe('ZapSubs End-to-End Integration Tests', () => {
    // Test data
    const testSubscriber = 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCISP7GGRL7PDUYOJG63VWOYYDQ';
    const testMerchant = 'GBBD47UZQ5UCHTCVYNJ27TJQF4YSBQHXY6NZJN3FJLSWDMNNGTQHBQW';
    const testAmount = 100;
    const testInterval = 86400; // 1 day

    // Setup/teardown
    beforeAll(async () => {
        // Clear collections before tests
        await Subscription.deleteMany({});
        await Payment.deleteMany({});
    });

    afterAll(async () => {
        // Cleanup
        await Subscription.deleteMany({});
        await Payment.deleteMany({});
    });

    describe('Subscription Creation Flow', () => {
        it('should create a subscription with valid data', async () => {
            const response = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: testInterval,
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.subscriber).toBe(testSubscriber);
            expect(response.body.merchant).toBe(testMerchant);
            expect(response.body.amount).toBe(testAmount);
            expect(response.body.interval).toBe(testInterval);
            expect(response.body.status).toBe('Active');
            expect(response.body).toHaveProperty('contractId');
        });

        it('should reject subscription creation with missing fields', async () => {
            const response = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    // Missing amount and interval
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should reject subscription creation with invalid amount', async () => {
            const response = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: -100, // Invalid: negative
                    interval: testInterval,
                });

            expect(response.status).toBe(400);
        });

        it('should reject subscription creation with invalid interval', async () => {
            const response = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: 0, // Invalid: zero
                });

            expect(response.status).toBe(400);
        });
    });

    describe('Subscription Retrieval', () => {
        beforeEach(async () => {
            // Ensure a subscription exists
            await Subscription.deleteMany({ subscriber: testSubscriber });
            await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: testInterval,
                });
        });

        it('should get subscription by subscriber address', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${testSubscriber}`);

            expect(response.status).toBe(200);
            expect(response.body.subscriber).toBe(testSubscriber);
            expect(response.body).toHaveProperty('escrowBalance');
            expect(response.body).toHaveProperty('nextPayment');
        });

        it('should return 404 for non-existent subscription', async () => {
            const response = await request(app)
                .get('/api/subscriptions/NONEXISTENT123456789');

            expect(response.status).toBe(404);
        });
    });

    describe('Subscription State Management', () => {
        beforeEach(async () => {
            await Subscription.deleteMany({ subscriber: testSubscriber });
            await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: testInterval,
                });
        });

        it('should pause an active subscription', async () => {
            const response = await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/pause`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('Paused');

            // Verify state persisted
            const getResponse = await request(app)
                .get(`/api/subscriptions/${testSubscriber}`);
            expect(getResponse.body.status).toBe('Paused');
        });

        it('should resume a paused subscription', async () => {
            // First pause
            await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/pause`);

            // Then resume
            const response = await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/resume`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('Active');
        });

        it('should cancel a subscription', async () => {
            const response = await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/cancel`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('Cancelled');
        });

        it('should not allow pause on cancelled subscription', async () => {
            // Cancel first
            await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/cancel`);

            // Try to pause
            const response = await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/pause`);

            expect(response.status).toBe(400);
        });

        it('should not allow resume on cancelled subscription', async () => {
            // Cancel first
            await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/cancel`);

            // Try to resume
            const response = await request(app)
                .patch(`/api/subscriptions/${testSubscriber}/resume`);

            expect(response.status).toBe(400);
        });
    });

    describe('Escrow Management', () => {
        beforeEach(async () => {
            await Subscription.deleteMany({ subscriber: testSubscriber });
            await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: testInterval,
                });
        });

        it('should deposit funds to escrow', async () => {
            const depositAmount = 50;
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/deposit`)
                .send({
                    subscriber: testSubscriber,
                    amount: depositAmount,
                });

            expect(response.status).toBe(200);
            expect(response.body.escrowBalance).toBeGreaterThanOrEqual(0);
        });

        it('should reject deposit with invalid amount', async () => {
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/deposit`)
                .send({
                    subscriber: testSubscriber,
                    amount: -50, // Invalid: negative
                });

            expect(response.status).toBe(400);
        });

        it('should withdraw funds from escrow', async () => {
            // First deposit
            await request(app)
                .post(`/api/subscriptions/${testSubscriber}/deposit`)
                .send({
                    subscriber: testSubscriber,
                    amount: 100,
                });

            // Then withdraw
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/withdraw`)
                .send({
                    subscriber: testSubscriber,
                    amount: 50,
                });

            expect(response.status).toBe(200);
        });

        it('should reject withdrawal exceeding balance', async () => {
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/withdraw`)
                .send({
                    subscriber: testSubscriber,
                    amount: 99999, // More than available
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Payment Management', () => {
        beforeEach(async () => {
            await Subscription.deleteMany({ subscriber: testSubscriber });
            await Payment.deleteMany({ subscriber: testSubscriber });
            await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSubscriber,
                    merchant: testMerchant,
                    amount: testAmount,
                    interval: testInterval,
                });
        });

        it('should get payment history', async () => {
            const response = await request(app)
                .get(`/api/subscriptions/${testSubscriber}/payments`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should execute a payment', async () => {
            // First deposit funds
            await request(app)
                .post(`/api/subscriptions/${testSubscriber}/deposit`)
                .send({
                    subscriber: testSubscriber,
                    amount: testAmount * 2,
                });

            // Execute payment
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/pay`)
                .send({
                    subscriber: testSubscriber,
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id');
        });

        it('should reject payment on insufficient escrow balance', async () => {
            const response = await request(app)
                .post(`/api/subscriptions/${testSubscriber}/pay`)
                .send({
                    subscriber: testSubscriber,
                    // No deposit made, escrow balance = 0
                });

            expect(response.status).toBe(400);
        });

        it('should update subscription nextPayment after successful payment', async () => {
            // First deposit funds
            await request(app)
                .post(`/api/subscriptions/${testSubscriber}/deposit`)
                .send({
                    subscriber: testSubscriber,
                    amount: testAmount * 2,
                });

            const before = await request(app)
                .get(`/api/subscriptions/${testSubscriber}`);
            const oldNextPayment = before.body.nextPayment;

            // Execute payment
            await request(app)
                .post(`/api/subscriptions/${testSubscriber}/pay`)
                .send({
                    subscriber: testSubscriber,
                });

            const after = await request(app)
                .get(`/api/subscriptions/${testSubscriber}`);

            // nextPayment should advance
            expect(after.body.nextPayment).toBeGreaterThan(oldNextPayment);
        });
    });

    describe('End-to-End Workflow', () => {
        const testSub2 = 'GA2YYX76PZEXZN7ZN66VXPZ7YXCQX3VXQZQ4Z7VXPZ7YXCQX3VXQZQ';
        const testMerch2 = 'GBQWP3BOUZX34ULNQG23RQ6F4BVWCISP7GGRL7PDUYOJG63VWOYYDQ';

        it('should complete full subscription lifecycle', async () => {
            // Step 1: Create subscription
            const createRes = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: testSub2,
                    merchant: testMerch2,
                    amount: 100,
                    interval: 3600, // 1 hour
                });
            expect(createRes.status).toBe(201);
            const subId = createRes.body._id;

            // Step 2: Verify subscription created
            const getRes = await request(app)
                .get(`/api/subscriptions/${testSub2}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.status).toBe('Active');

            // Step 3: Deposit funds
            const depositRes = await request(app)
                .post(`/api/subscriptions/${testSub2}/deposit`)
                .send({
                    subscriber: testSub2,
                    amount: 500,
                });
            expect(depositRes.status).toBe(200);

            // Step 4: Pause subscription
            const pauseRes = await request(app)
                .patch(`/api/subscriptions/${testSub2}/pause`);
            expect(pauseRes.status).toBe(200);
            expect(pauseRes.body.status).toBe('Paused');

            // Step 5: Resume subscription
            const resumeRes = await request(app)
                .patch(`/api/subscriptions/${testSub2}/resume`);
            expect(resumeRes.status).toBe(200);
            expect(resumeRes.body.status).toBe('Active');

            // Step 6: Withdraw some funds
            const withdrawRes = await request(app)
                .post(`/api/subscriptions/${testSub2}/withdraw`)
                .send({
                    subscriber: testSub2,
                    amount: 100,
                });
            expect(withdrawRes.status).toBe(200);

            // Step 7: Cancel subscription
            const cancelRes = await request(app)
                .patch(`/api/subscriptions/${testSub2}/cancel`);
            expect(cancelRes.status).toBe(200);
            expect(cancelRes.body.status).toBe('Cancelled');

            // Step 8: Verify final state
            const finalRes = await request(app)
                .get(`/api/subscriptions/${testSub2}`);
            expect(finalRes.status).toBe(200);
            expect(finalRes.body.status).toBe('Cancelled');
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/subscriptions')
                .set('Content-Type', 'application/json')
                .send('{ invalid json');

            expect(response.status).toBe(400);
        });

        it('should handle non-existent endpoints', async () => {
            const response = await request(app)
                .get('/api/subscriptions/nonexistent/invalid');

            expect(response.status).toBe(404);
        });
    });
});