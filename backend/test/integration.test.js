import request from 'supertest';
import app from '../src/app.js';

describe('API Integration Tests', () => {
    it('should create a subscription', async () => {
        const response = await request(app)
            .post('/api/subscriptions')
            .send({
                subscriber: 'test_subscriber',
                merchant: 'test_merchant',
                amount: 100,
                interval: 86400
            });
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('subscriber');
    });

    it('should get subscription', async () => {
        const response = await request(app)
            .get('/api/subscriptions/test_subscriber');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('subscriber');
    });

    it('should pause subscription', async () => {
        const response = await request(app)
            .patch('/api/subscriptions/test_subscriber/pause');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('Paused');
    });

    // Add more tests as needed
});