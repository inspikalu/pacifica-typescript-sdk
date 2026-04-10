import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });
  const ws = client.connectWebSocket();

  const response = await ws.createLimitOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
    price: "100000",
    tif: "GTC",
  });

  console.log("Response:", response);
  ws.disconnect();
}

main().catch(console.error);
