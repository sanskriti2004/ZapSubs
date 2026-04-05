import nodemailer from 'nodemailer';

export async function sendNotification(to, subject, message) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text: message,
        });
    } catch (err) {
        console.error('Notification failed:', err.message);
    }
}
