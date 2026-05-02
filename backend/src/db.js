import mongoose from 'mongoose';

let connection = null;

await mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: true,
});

export async function connectDB() {
    if (connection) return connection;
    connection = await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    return connection;
}
