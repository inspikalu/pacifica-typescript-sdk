import { PacificaClient } from "../../src/index.js";

const ACCOUNT = "dev1S2tC8CSZXzTQzVacYvkqWwD37dTqiCKaeJCWhwM"; // replace with your account

async function main() {
  const client = new PacificaClient({ privateKey: "unused-for-subscriptions" });
  const ws = client.connectWebSocket();

  console.log(`Subscribing to TWAP orders & updates for ${ACCOUNT}...`);

  await ws.subscribeTwapOrders(ACCOUNT, (data) => {
    console.log("TWAP orders snapshot:", data);
  });

  await ws.subscribeTwapOrderUpdates(ACCOUNT, (data) => {
    console.log("TWAP order update:", data);
  });

  process.on("SIGINT", () => {
    ws.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);
