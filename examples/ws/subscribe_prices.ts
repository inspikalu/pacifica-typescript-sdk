import { PacificaClient } from "../../src/index.js";

async function main() {
  const client = new PacificaClient({ privateKey: "unused-for-subscriptions" });
  const ws = client.connectWebSocket();

  console.log("Subscribing to live price feed...");
  await ws.subscribePrices((data) => {
    console.log("Price update:", data);
  });

  // Keep running
  process.on("SIGINT", () => {
    ws.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
