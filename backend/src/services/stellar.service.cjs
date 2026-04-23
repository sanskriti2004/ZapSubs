const StellarSdk = require("@stellar/stellar-sdk");
const Server = StellarSdk.Server;
const Networks = StellarSdk.Networks;
const Keypair = StellarSdk.Keypair;
const SorobanRpc = StellarSdk.SorobanRpc;
const TransactionBuilder = StellarSdk.TransactionBuilder;
const Operation = StellarSdk.Operation;
const Contract = StellarSdk.Contract;
const Address = StellarSdk.Address;
const nativeToScVal = StellarSdk.nativeToScVal;
const scValToNative = StellarSdk.scValToNative;
const Subscription = require("../models/subscription.model.js");
const Payment = require("../models/payment.model.js");
const { sendNotification } = require("./notification.service.js");

const server = new StellarSdk.rpc.Server(
  "https://soroban-testnet.stellar.org",
);
const networkPassphrase = Networks.TESTNET;

// assume contractId is set in env
const contractId = process.env.CONTRACT_ID;

// contract instance
function getContract() { return new Contract(process.env.CONTRACT_ID); }

module.exports.initializeSubscription = async function (
  subscriber,
  merchant,
  amount,
  interval,
) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(
      getContract().call("initialize", subscriber, merchant, amount, interval),
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.depositToEscrow = async function (subscriber, amount) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("deposit", subscriber, amount))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.withdrawFromEscrow = async function (subscriber, amount) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("withdraw", subscriber, amount))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.executePayment = async function () {
  // this might need to be called by cron without key, if contract allows for now, assume admin key
  const keypair = Keypair.fromSecret(process.env.ADMIN_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("execute_payment"))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.pauseSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("pause", subscriber))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.resumeSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("resume", subscriber))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.cancelSubscription = async function (subscriber) {
  const keypair = Keypair.fromSecret(process.env.SUBSCRIBER_SECRET_KEY);
  const account = await server.getAccount(keypair.publicKey());

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("cancel", subscriber))
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  const result = await server.sendTransaction(tx);
  return result;
};

module.exports.getSubscriptionState = async function () {
  // use simulateTransaction to read
  const account = await server.getAccount("GA..."); // dummy account for read
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase,
  })
    .addOperation(getContract().call("get_subscription"))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  return scValToNative(result.result.retval);
};

// event listener with improved reliability
let lastProcessedLedger = 0;

module.exports.listenForEvents = async function () {
  const pollEvents = async () => {
    try {
      // get latest ledger
      const latestLedger = await server.getLatestLedger();
      const startLedger = Math.max(
        lastProcessedLedger + 1,
        latestLedger.sequence - 10,
      ); // last 10 ledgers

      // get events from contract
      const events = await server.getEvents({
        filters: [
          {
            contractIds: [contractId],
            topics: [["*"]], // all topics
          },
        ],
        startLedger,
      });

      for (const event of events.events) {
        try {
          // process event
          const topic = event.topic.map((t) => scValToNative(t));
          const value = scValToNative(event.value);

          if (topic[0] === "PAYMENT") {
            // record payment
            await Payment.create({
              subscriber: value.subscriber,
              merchant: value.merchant,
              amount: value.amount,
              txHash: event.txHash,
            });

            // notify
            await sendNotification(
              value.subscriber,
              "Payment executed",
              `Payment of ${value.amount} to ${value.merchant}`,
            );
          }
          // handle other events as needed
        } catch (processError) {
          console.error("Error processing event:", processError);
        }
      }

      lastProcessedLedger = latestLedger.sequence;
    } catch (error) {
      console.error("Error polling events:", error);
      // retry after delay
      setTimeout(pollEvents, 10000); // retry in 10 seconds
      return;
    }

    setTimeout(pollEvents, 30000); // poll every 30 seconds
  };

  // start polling
  pollEvents();
};

// cron job for triggering payments
module.exports.startCronJob = function () {
  const cron = require("node-cron");

  cron.schedule("* * * * *", async () => {
    const subscriptions = await Subscription.find({ status: "Active" });

    for (const sub of subscriptions) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime >= sub.nextPayment) {
        try {
          await executePayment();
          // update nextPayment in DB
          sub.nextPayment += sub.interval;
          await sub.save();
        } catch (error) {
          console.error("Failed to execute payment:", error);
        }
      }
    }
  });
};


