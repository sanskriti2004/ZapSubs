import Subscription from "../models/subscription.model.js";
import Payment from "../models/payment.model.js";
import { sendNotification } from "./notification.service.js";
import {
  initializeSubscription,
  pauseSubscription as stellarPause,
  resumeSubscription as stellarResume,
  cancelSubscription as stellarCancel,
  depositToEscrow,
  withdrawFromEscrow,
  executePayment,
} from "./stellar.service.cjs";

export async function createSubscription(req, res) {
  try {
    const { subscriber, merchant, amount, interval } = req.body;

    // call contract initialize
    await initializeSubscription(subscriber, merchant, amount, interval);

    const nextPayment = Math.floor(Date.now() / 1000) + interval;

    const subscription = await Subscription.create({
      subscriber,
      merchant,
      amount,
      interval,
      nextPayment,
      status: "Active",
      escrowBalance: 0,
    });

    await sendNotification(
      subscriber,
      "Subscription created",
      `Your subscription of ${amount} every ${interval}s is now active.`,
    );

    res.status(201).json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSubscription(req, res) {
  try {
    const subscription = await Subscription.findOne({
      subscriber: req.params.subscriber,
    });
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function pauseSubscription(req, res) {
  try {
    // call contract pause
    await stellarPause(req.params.subscriber);

    const subscription = await Subscription.findOneAndUpdate(
      { subscriber: req.params.subscriber },
      { status: "Paused" },
      { new: true },
    );
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    await sendNotification(
      subscription.subscriber,
      "Subscription paused",
      "Your subscription has been paused.",
    );

    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resumeSubscription(req, res) {
  try {
    // call contract resume
    await stellarResume(req.params.subscriber);

    const subscription = await Subscription.findOneAndUpdate(
      { subscriber: req.params.subscriber },
      { status: "Active" },
      { new: true },
    );
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    await sendNotification(
      subscription.subscriber,
      "Subscription resumed",
      "Your subscription is active again.",
    );

    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function cancelSubscription(req, res) {
  try {
    // call contract cancel
    await stellarCancel(req.params.subscriber);

    const subscription = await Subscription.findOneAndUpdate(
      { subscriber: req.params.subscriber },
      { status: "Cancelled" },
      { new: true },
    );
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    await sendNotification(
      subscription.subscriber,
      "Subscription cancelled",
      "Your subscription has been cancelled.",
    );

    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPaymentHistory(req, res) {
  try {
    const payments = await Payment.find({
      subscriber: req.params.subscriber,
    }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function depositFunds(req, res) {
  try {
    const { subscriber, amount } = req.body;

    // call contract deposit
    await depositToEscrow(subscriber, amount);

    // update DB escrow balance
    const subscription = await Subscription.findOneAndUpdate(
      { subscriber },
      { $inc: { escrowBalance: amount } },
      { new: true },
    );
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function withdrawFunds(req, res) {
  try {
    const { subscriber, amount } = req.body;

    // call contract withdraw
    await withdrawFromEscrow(subscriber, amount);

    // update DB escrow balance
    const subscription = await Subscription.findOneAndUpdate(
      { subscriber },
      { $inc: { escrowBalance: -amount } },
      { new: true },
    );
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function payNow(req, res) {
  try {
    const subscriber = req.params.subscriber;

    // call contract execute payment
    await executePayment();

    // update DB nextPayment
    const subscription = await Subscription.findOne({ subscriber });
    if (!subscription)
      return res.status(404).json({ error: "Subscription not found" });

    subscription.nextPayment += subscription.interval;
    await subscription.save();

    res.json({ message: "Payment executed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
