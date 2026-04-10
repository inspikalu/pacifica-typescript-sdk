import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = ""; // e.g. "2Z2Wn4kN5ZNhZzuFTQSyTiN4ixX8U6ew5wPDJbHngZaC3zF3uWNj4dQ63cnGfXpw1cESZPCqvoZE7VURyuj9kf8b"

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  console.log("Account:", client.getPublicKey());

  const response = await client.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
    slippage_percent: "0.5",
  });

  console.log("Response:", response);
}

main().catch(console.error);
