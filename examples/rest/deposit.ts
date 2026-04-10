import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";
const DEPOSIT_AMOUNT = 100; // USDC — minimum is 10

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  console.log("Depositing", DEPOSIT_AMOUNT, "USDC from", client.getPublicKey());
  const txSignature = await client.deposit(DEPOSIT_AMOUNT);
  console.log("Deposit transaction signature:", txSignature);
  console.log("Explorer:", `https://solscan.io/tx/${txSignature}`);
}

main().catch(console.error);
