import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    subscriber: { type: String, required: true },
    merchant: { type: String, required: true },
    amount: { type: Number, required: true },
    interval: { type: Number, required: true },
    nextPayment: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Cancelled'],
        default: 'Active'
    },
    escrowBalance: { type: Number, default: 0 },
    contractId: { type: String },
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
