import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });
  const ws = client.connectWebSocket();

  console.log("Placing market order via WebSocket...");
  const response = await ws.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
    slippage_percent: "0.5",
  });

  console.log("Response:", response);
  ws.disconnect();
}

main().catch(console.error);
