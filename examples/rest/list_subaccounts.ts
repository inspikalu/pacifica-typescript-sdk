import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });
  const subaccounts = await client.listSubaccounts();
  console.log("Subaccounts:", JSON.stringify(subaccounts, null, 2));
}

main().catch(console.error);
