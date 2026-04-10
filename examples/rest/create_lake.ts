import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  const response = await client.createLake({
    manager: client.getPublicKey(), // or another valid account — not a sublake
    nickname: "Moraine Lake",       // optional
  });

  console.log("Lake created:", response);
}

main().catch(console.error);
