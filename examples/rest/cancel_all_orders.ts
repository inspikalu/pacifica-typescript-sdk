import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  // Cancel all open orders across all markets
  const response = await client.cancelAllOrders();
  console.log("Response:", response);

  // Or cancel only BTC orders
  // const response = await client.cancelAllOrders({ symbol: "BTC" });
}

main().catch(console.error);
