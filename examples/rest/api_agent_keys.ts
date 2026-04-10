/**
 * Agent wallets allow a "hot" signing key to place orders on behalf of a main
 * account — without exposing the main private key at runtime.
 *
 * Flow:
 *   1. Generate an agent wallet keypair
 *   2. Bind it to the main account (signed by main)
 *   3. Use the agent wallet to sign future orders
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  // 1. Create main client
  const mainClient = new PacificaClient({ privateKey: PRIVATE_KEY });
  console.log("Main account:", mainClient.getPublicKey());

  // 2. Generate a new agent wallet
  const agentKeypair = Keypair.generate();
  const agentPrivateKey = bs58.encode(agentKeypair.secretKey);
  const agentPublicKey = agentKeypair.publicKey.toBase58();
  console.log("Agent wallet:", agentPublicKey);

  // 3. Bind the agent wallet to the main account (signed by main)
  const bindResponse = await mainClient.bindAgentWallet(agentPublicKey);
  console.log("Bind response:", bindResponse);

  // 4. Create an agent-wallet client — orders are signed by agent, attributed to main
  const agentClient = new PacificaClient({
    privateKey: PRIVATE_KEY,           // main account (used for account field)
    agentWalletPrivateKey: agentPrivateKey,  // agent signs orders
  });

  const orderResponse = await agentClient.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
  });
  console.log("Order via agent wallet:", orderResponse);
}

main().catch(console.error);
