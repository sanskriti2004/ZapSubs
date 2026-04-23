import app from "./app.js";
import { connectDB } from "./db.js";
import { listenForEvents, startCronJob } from "./services/stellar.service.cjs";

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();
  // start event listener and cron
  listenForEvents();
  startCronJob();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
