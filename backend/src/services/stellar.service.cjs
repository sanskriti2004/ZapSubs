const StellarSdk = require("@stellar/stellar-sdk");
const Networks = StellarSdk.Networks;
const Keypair = StellarSdk.Keypair;
const TransactionBuilder = StellarSdk.TransactionBuilder;
const Contract = StellarSdk.Contract;
const scValToNative = StellarSdk.scValToNative;

const server = new StellarSdk.rpc.Server("https://soroban-testnet.stellar.org");
const networkPassphrase = Networks.TESTNET;
const contractId = process.env.CONTRACT_ID;

function getContract() { return new Contract(process.env.CONTRACT_ID); }

module.exports.initializeSubscription = async function (subscriber, merchant, amount, interval) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("initialize", subscriber, merchant, amount, interval))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.depositToEscrow = async function (subscriber, amount) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("deposit", subscriber, amount))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.withdrawFromEscrow = async function (subscriber, amount) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("withdraw", subscriber, amount))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.executePayment = async function () {
  const keypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("execute_payment"))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.pauseSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("pause", subscriber))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.resumeSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("resume", subscriber))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.cancelSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("cancel", subscriber))
    .setTimeout(30).build();
  tx.sign(keypair);
  return await server.sendTransaction(tx);
};

module.exports.getSubscriptionState = async function () {
  const account = await server.getAccount("GA...");
  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase })
    .addOperation(getContract().call("get_subscription"))
    .setTimeout(30).build();
  const result = await server.simulateTransaction(tx);
  return scValToNative(result.result.retval);
};

let lastProcessedLedger = 0;

module.exports.listenForEvents = async function () {
  const pollEvents = async () => {
    if (!contractId || contractId === 'PLACEHOLDER') {
      setTimeout(pollEvents, 30000);
      return;
    }
    try {
      const latestLedger = await server.getLatestLedger();
      const startLedger = Math.max(lastProcessedLedger + 1, latestLedger.sequence - 10);
      const events = await server.getEvents({
        filters: [{ contractIds: [contractId], topics: [["*"]] }],
        startLedger,
      });
      for (const event of events.events) {
        try {
          const topic = event.topic.map((t) => scValToNative(t));
          const value = scValToNative(event.value);
          if (topic[0] === "PAYMENT") {
            const { default: Payment } = await import("../models/payment.model.js");
            const { sendNotification } = await import("./notification.service.js");
            await Payment.create({
              subscriber: value.subscriber,
              merchant: value.merchant,
              amount: value.amount,
              txHash: event.txHash,
            });
            await sendNotification(value.subscriber, "Payment executed", `Payment of ${value.amount} to ${value.merchant}`);
          }
        } catch (processError) {
          console.error("Error processing event:", processError);
        }
      }
      lastProcessedLedger = latestLedger.sequence;
    } catch (error) {
      console.error("Error polling events:", error);
      setTimeout(pollEvents, 10000);
      return;
    }
    setTimeout(pollEvents, 30000);
  };
  pollEvents();
};

module.exports.startCronJob = function () {
  const cron = require("node-cron");
  cron.schedule("* * * * *", async () => {
    const { default: Subscription } = await import("../models/subscription.model.js");
    const subscriptions = await Subscription.find({ status: "Active" });
    for (const sub of subscriptions) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= sub.nextPayment) {
        try {
          await module.exports.executePayment();
          sub.nextPayment += sub.interval;
          await sub.save();
        } catch (error) {
          console.error("Failed to execute payment:", error);
        }
      }
    }
  });
};
