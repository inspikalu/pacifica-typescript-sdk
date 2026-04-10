import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  // Build a Create action and a Cancel action, then submit atomically
  const createAction = client.buildCreateOrderAction({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
    price: "100000",
    tif: "GTC",
  });

  const cancelAction = client.buildCancelOrderAction({
    symbol: "BTC",
    order_id: 42069,
  });

  const response = await client.batchOrders([createAction, cancelAction]);
  console.log("Response:", response);
}

main().catch(console.error);
