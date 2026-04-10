import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });
  const ws = client.connectWebSocket();

  const response = await ws.cancelAllOrders({ symbol: "BTC" });
  console.log("Response:", response);
  ws.disconnect();
}

main().catch(console.error);
