import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  const response = await client.updateLeverage({ symbol: "BTC", leverage: 42 });
  console.log("Response:", response);
}

main().catch(console.error);
