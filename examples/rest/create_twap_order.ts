import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  // TWAP over 7 sub-orders spaced 30s apart = 180s total duration
  const plannedSubOrderCount = 7;
  const response = await client.createTwapOrder({
    symbol: "BTC",
    side: "bid",
    amount: "1",
    duration_in_seconds: 30 * (plannedSubOrderCount - 1),
    slippage_percent: "0.5",
  });

  console.log("Response:", response);
}

main().catch(console.error);
