import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import subscriptionRoutes from './routes/subscription.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/subscriptions', subscriptionRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
