#!/usr/bin/env node

/**
 * ZapSubs End-to-End Integration Test Runner
 * 
 * This script tests the complete subscription flow from wallet connection
 * through payment execution.
 * 
 * Usage:
 *   node backend-e2e-test.js [--watch] [--verbose]
 */

import request from 'supertest';
import app from '../src/app.js';
import Subscription from '../src/models/subscription.model.js';
import Payment from '../src/models/payment.model.js';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    gray: '\x1b[90m'
};

function log(type, message) {
    const prefix = {
        '✓': colors.green + '✓' + colors.reset,
        '✕': colors.red + '✕' + colors.reset,
        '⚠': colors.yellow + '⚠' + colors.reset,
        'ℹ': colors.blue + 'ℹ' + colors.reset,
    }[type] || type;
    
    console.log(`${prefix} ${message}`);
}

class E2ETestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.tests = [];
        this.testData = {
            subscriber: 'GBUQWP3BOUZX34ULNQG23RQ6F4BVWCISP7GGRL7PDUYOJG63VWOYYDQ',
            merchant: 'GBBD47UZQ5UCHTCVYNJ27TJQF4YSBQHXY6NZJN3FJLSWDMNNGTQHBQW',
            amount: 100,
            interval: 86400,
        };
    }

    async test(name, fn) {
        try {
            await fn();
            this.passed++;
            log('✓', name);
            return true;
        } catch (err) {
            this.failed++;
            log('✕', name);
            log('ℹ', err.message);
            return false;
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    async assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: expected ${expected}, got ${actual}`);
        }
    }

    async setup() {
        log('ℹ', 'Clearing test data...');
        await Subscription.deleteMany({});
        await Payment.deleteMany({});
        log('✓', 'Test database ready');
    }

    async cleanup() {
        log('ℹ', 'Cleaning up test data...');
        await Subscription.deleteMany({});
        await Payment.deleteMany({});
    }

    summary() {
        console.log('\n' + '='.repeat(50));
        console.log(`${colors.blue}Test Results${colors.reset}`);
        console.log('='.repeat(50));
        console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`);
        console.log(`${colors.red}Failed: ${this.failed}${colors.reset}`);
        console.log(`Total: ${this.passed + this.failed}`);
        console.log('='.repeat(50) + '\n');
        
        return this.failed === 0;
    }

    async run() {
        await this.setup();

        console.log(`\n${colors.blue}Starting E2E Tests${colors.reset}\n`);

        // Test 1: Create subscription
        await this.test('Create subscription with valid data', async () => {
            const res = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: this.testData.subscriber,
                    merchant: this.testData.merchant,
                    amount: this.testData.amount,
                    interval: this.testData.interval,
                });
            
            this.assert(res.status === 201, `Expected 201, got ${res.status}`);
            this.assert(res.body.subscriber === this.testData.subscriber, 'Subscriber mismatch');
            this.assert(res.body.status === 'Active', `Expected Active status, got ${res.body.status}`);
            this.assert(res.body.contractId, 'Missing contractId');
        });

        // Test 2: Get subscription
        await this.test('Retrieve created subscription', async () => {
            const res = await request(app)
                .get(`/api/subscriptions/${this.testData.subscriber}`);
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body.subscriber === this.testData.subscriber, 'Subscriber mismatch');
            this.assert(res.body.escrowBalance !== undefined, 'Missing escrowBalance');
            this.assert(res.body.nextPayment, 'Missing nextPayment');
        });

        // Test 3: Deposit funds
        await this.test('Deposit funds to escrow', async () => {
            const depositAmount = 500;
            const res = await request(app)
                .post(`/api/subscriptions/${this.testData.subscriber}/deposit`)
                .send({
                    subscriber: this.testData.subscriber,
                    amount: depositAmount,
                });
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body.escrowBalance >= 0, 'Invalid escrowBalance after deposit');
        });

        // Test 4: Pause subscription
        await this.test('Pause active subscription', async () => {
            const res = await request(app)
                .patch(`/api/subscriptions/${this.testData.subscriber}/pause`);
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body.status === 'Paused', `Expected Paused, got ${res.body.status}`);
        });

        // Test 5: Resume subscription
        await this.test('Resume paused subscription', async () => {
            const res = await request(app)
                .patch(`/api/subscriptions/${this.testData.subscriber}/resume`);
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body.status === 'Active', `Expected Active, got ${res.body.status}`);
        });

        // Test 6: Withdraw funds
        await this.test('Withdraw funds from escrow', async () => {
            const res = await request(app)
                .post(`/api/subscriptions/${this.testData.subscriber}/withdraw`)
                .send({
                    subscriber: this.testData.subscriber,
                    amount: 100,
                });
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
        });

        // Test 7: Payment history
        await this.test('Get payment history', async () => {
            const res = await request(app)
                .get(`/api/subscriptions/${this.testData.subscriber}/payments`);
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(Array.isArray(res.body), 'Response should be an array');
        });

        // Test 8: Execute payment
        await this.test('Execute payment from escrow', async () => {
            const res = await request(app)
                .post(`/api/subscriptions/${this.testData.subscriber}/pay`)
                .send({ subscriber: this.testData.subscriber });
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body._id, 'Missing payment ID');
        });

        // Test 9: Verify payment recorded
        await this.test('Verify payment in history', async () => {
            const res = await request(app)
                .get(`/api/subscriptions/${this.testData.subscriber}/payments`);
            
            this.assert(res.status === 200, 'Failed to get payment history');
            this.assert(res.body.length > 0, 'No payments in history');
        });

        // Test 10: Cancel subscription
        await this.test('Cancel subscription', async () => {
            const res = await request(app)
                .patch(`/api/subscriptions/${this.testData.subscriber}/cancel`);
            
            this.assert(res.status === 200, `Expected 200, got ${res.status}`);
            this.assert(res.body.status === 'Cancelled', `Expected Cancelled, got ${res.body.status}`);
        });

        // Test 11: Error handling - invalid amount
        await this.test('Reject invalid subscription amount', async () => {
            const res = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: 'TEST_SUBSCRIBER_2',
                    merchant: this.testData.merchant,
                    amount: -100, // Invalid
                    interval: this.testData.interval,
                });
            
            this.assert(res.status >= 400, `Expected error status, got ${res.status}`);
        });

        // Test 12: Error handling - missing fields
        await this.test('Reject incomplete subscription', async () => {
            const res = await request(app)
                .post('/api/subscriptions')
                .send({
                    subscriber: 'TEST',
                    merchant: 'TEST_MERCHANT',
                    // Missing amount and interval
                });
            
            this.assert(res.status >= 400, `Expected error status, got ${res.status}`);
        });

        // Test 13: Non-existent subscription
        await this.test('Handle non-existent subscription', async () => {
            const res = await request(app)
                .get('/api/subscriptions/NONEXISTENT');
            
            this.assert(res.status === 404, `Expected 404, got ${res.status}`);
        });

        // Cleanup
        await this.cleanup();

        // Print summary
        const success = this.summary();
        process.exit(success ? 0 : 1);
    }
}

// Run tests
const runner = new E2ETestRunner();
runner.run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
