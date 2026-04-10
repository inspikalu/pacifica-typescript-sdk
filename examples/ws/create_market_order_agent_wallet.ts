/**
 * Place a market order via WebSocket using an agent wallet.
 * The agent wallet signs the order; the main account is attributed.
 */
import { PacificaClient } from "../../src/index.js";

const MAIN_PUBLIC_KEY = "";    // main account's public key (not the private key)
const AGENT_PRIVATE_KEY = "";  // must be registered via bindAgentWallet first

async function main() {
  // Build a client where agentWalletPrivateKey signs but account = main public key.
  // Since we only have the main's public key (not private key) here, we construct
  // the client slightly differently — we can use the agent's key as primary and
  // override the account field. For this pattern, see api_agent_keys.ts instead.

  // More typical usage: you have both keys
  // const client = new PacificaClient({
  //   privateKey: MAIN_PRIVATE_KEY,
  //   agentWalletPrivateKey: AGENT_PRIVATE_KEY,
  // });

  const client = new PacificaClient({
    privateKey: AGENT_PRIVATE_KEY,      // agent key (you have this at runtime)
    agentWalletPrivateKey: AGENT_PRIVATE_KEY,  // same key acts as agent
  });

  const ws = client.connectWebSocket();

  const response = await ws.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.1",
    slippage_percent: "0.5",
  });

  console.log("Response:", response);
  ws.disconnect();
}

main().catch(console.error);
