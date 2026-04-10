import { PacificaClient } from "../../src/index.js";

const FROM_PRIVATE_KEY = ""; // main account or subaccount
const TO_PUBLIC_KEY = "";    // the other side (child or parent)

async function main() {
  const client = new PacificaClient({ privateKey: FROM_PRIVATE_KEY });

  const response = await client.transferSubaccountFunds({
    to_account: TO_PUBLIC_KEY,
    amount: "420.69",
  });

  console.log("Transfer response:", response);
  console.log("From:", client.getPublicKey());
  console.log("To:", TO_PUBLIC_KEY);
}

main().catch(console.error);
