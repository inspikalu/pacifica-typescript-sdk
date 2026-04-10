import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";
const LAKE_ACCOUNT = ""; // public key of the lake

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  const depositResponse = await client.lakeDeposit({
    lake_account: LAKE_ACCOUNT,
    amount: "100",
  });
  console.log("Lake deposit:", depositResponse);

  const withdrawResponse = await client.lakeWithdraw({
    lake_account: LAKE_ACCOUNT,
    amount: "50",
  });
  console.log("Lake withdraw:", withdrawResponse);
}

main().catch(console.error);
