import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = ""; // main account

async function main() {
  const client = new PacificaClient({ 
    privateKey: PRIVATE_KEY, 
    network: "testnet" 
  });

  console.log("--- Open TWAP Orders ---");
  const open = await client.getOpenTwapOrders();
  console.log(JSON.stringify(open, null, 2));

  console.log("\n--- TWAP Order History ---");
  const history = await client.getTwapOrderHistory();
  console.log(JSON.stringify(history, null, 2));

  // Example of fetching by ID (if history is not empty)
  // const single = await client.getTwapOrderById(123);
}

main().catch(console.error);
