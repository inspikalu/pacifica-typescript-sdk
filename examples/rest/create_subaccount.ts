/**
 * Create a subaccount linked to a main account.
 *
 * Authentication flow (cross-signature scheme):
 *   1. Subaccount signs main account's public key  → sub_signature
 *   2. Main account signs sub_signature            → main_signature
 *   3. Both signatures sent to the API for verification
 */
import { PacificaClient } from "../../src/index.js";

const MAIN_PRIVATE_KEY = "";
const SUB_PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: MAIN_PRIVATE_KEY });

  const response = await client.createSubaccount({
    subPrivateKey: SUB_PRIVATE_KEY,
  });

  console.log("Subaccount created:", response);
}

main().catch(console.error);
