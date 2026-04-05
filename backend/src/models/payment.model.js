import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    subscriber: { type: String, required: true },
    merchant: { type: String, required: true },
    amount: { type: Number, required: true },
    txHash: { type: String },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success'
    },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
