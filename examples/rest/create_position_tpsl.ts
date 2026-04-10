import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  // Assume a BTC long position is already open
  const response = await client.setPositionTpsl({
    symbol: "BTC",
    side: "ask", // opposite of long = ask
    take_profit: {
      stop_price: "120000",
      limit_price: "120300",
      amount: "0.1",
    },
    stop_loss: {
      stop_price: "99800",
      // omit limit_price → market order at trigger
      // omit amount → use full position size
    },
  });

  console.log("Response:", response);
}

main().catch(console.error);
