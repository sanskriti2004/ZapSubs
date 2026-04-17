import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Enhanced error handling with retry logic
export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

// Request interceptor for auth headers
export function setApiToken(token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Response interceptor for enhanced error handling
api.interceptors.response.use(
    res => res,
    err => {
        const status = err.response?.status;
        const message =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'An error occurred';

        if (status === 401) {
            // Handle unauthorized - clear token and redirect to wallet connection
            delete api.defaults.headers.common['Authorization'];
        }

        throw new ApiError(message, status, err.response?.data);
    }
);

// Retry wrapper for transient failures
async function retryRequest(fn, maxRetries = 2, delayMs = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            // Only retry on network or 503 Unavailable errors
            if (attempt < maxRetries && (err.code === 'ECONNABORTED' || err.status === 503)) {
                await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
                continue;
            }
            break;
        }
    }
    throw lastError;
}

export async function createSubscription(data) {
    return retryRequest(
        () => api.post('/subscriptions', data)
    ).then(res => res.data);
}

export async function getSubscription(subscriber) {
    return retryRequest(
        () => api.get(`/subscriptions/${subscriber}`)
    ).then(res => res.data);
}

export async function pauseSubscription(subscriber) {
    return retryRequest(
        () => api.patch(`/subscriptions/${subscriber}/pause`)
    ).then(res => res.data);
}

export async function resumeSubscription(subscriber) {
    return retryRequest(
        () => api.patch(`/subscriptions/${subscriber}/resume`)
    ).then(res => res.data);
}

export async function cancelSubscription(subscriber) {
    return retryRequest(
        () => api.patch(`/subscriptions/${subscriber}/cancel`)
    ).then(res => res.data);
}

export async function getPaymentHistory(subscriber) {
    return retryRequest(
        () => api.get(`/subscriptions/${subscriber}/payments`)
    ).then(res => res.data);
}

export async function depositFunds(data) {
    return retryRequest(
        () => api.post(`/subscriptions/${data.subscriber}/deposit`, data)
    ).then(res => res.data);
}

export async function withdrawFunds(data) {
    return retryRequest(
        () => api.post(`/subscriptions/${data.subscriber}/withdraw`, data)
    ).then(res => res.data);
}

export async function payNow(subscriber) {
    return retryRequest(
        () => api.post(`/subscriptions/${subscriber}/pay`)
    ).then(res => res.data);
}

export default api;
