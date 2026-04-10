import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  const response = await client.cancelOrder({
    symbol: "BTC",
    order_id: 42069,
    // or: client_order_id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  });

  console.log("Response:", response);
}

main().catch(console.error);
