import { Router } from 'express';
import {
    createSubscription,
    getSubscription,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    getPaymentHistory,
} from '../services/subscription.service.js';

const router = Router();

router.post('/', createSubscription);
router.get('/:subscriber', getSubscription);
router.patch('/:subscriber/pause', pauseSubscription);
router.patch('/:subscriber/resume', resumeSubscription);
router.patch('/:subscriber/cancel', cancelSubscription);
router.get('/:subscriber/payments', getPaymentHistory);

export default router;
