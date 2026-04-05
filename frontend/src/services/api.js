import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

export async function createSubscription(data) {
    const res = await api.post('/subscriptions', data);
    return res.data;
}

export async function getSubscription(subscriber) {
    const res = await api.get(`/subscriptions/${subscriber}`);
    return res.data;
}

export async function pauseSubscription(subscriber) {
    const res = await api.patch(`/subscriptions/${subscriber}/pause`);
    return res.data;
}

export async function resumeSubscription(subscriber) {
    const res = await api.patch(`/subscriptions/${subscriber}/resume`);
    return res.data;
}

export async function cancelSubscription(subscriber) {
    const res = await api.patch(`/subscriptions/${subscriber}/cancel`);
    return res.data;
}

export async function getPaymentHistory(subscriber) {
    const res = await api.get(`/subscriptions/${subscriber}/payments`);
    return res.data;
}
