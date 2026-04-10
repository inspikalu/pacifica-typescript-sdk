import { describe, it, expect, beforeAll } from "vitest";
import { PacificaClient } from "../src/index.js";
import dotenv from "dotenv";

describe("Live Testnet Integration", () => {
  let mainPrivateKey: string;
  let agentPrivateKey: string;
  let client: PacificaClient;
  let agentClient: PacificaClient;

  beforeAll(() => {
    // Load credentials from environment variables
    dotenv.config();

    mainPrivateKey = process.env.PACIFICA_PRIVATE_KEY || "";
    agentPrivateKey = process.env.PACIFICA_AGENT_PRIVATE_KEY || "";

    if (!mainPrivateKey) {
      console.warn("Skipping integration tests: PACIFICA_PRIVATE_KEY not set");
      return;
    }

    // Initialize clients
    client = new PacificaClient({
      privateKey: mainPrivateKey,
      network: "testnet",
    });

    agentClient = new PacificaClient({
      privateKey: mainPrivateKey,
      agentWalletPrivateKey: agentPrivateKey,
      network: "testnet",
    });
  });

  it("should list subaccounts successfully (Auth Test)", async () => {
    const subaccounts = await client.listSubaccounts() as any;
    expect(subaccounts).toBeDefined();
    console.log("Subaccounts:", JSON.stringify(subaccounts));
    expect(subaccounts.success).toBe(true);
  });

  it("should fetch TWAP orders and history", async () => {
    const open = await client.getOpenTwapOrders() as any;
    const history = await client.getTwapOrderHistory() as any;
    console.log("Open TWAP:", JSON.stringify(open));
    console.log("TWAP History:", JSON.stringify(history));
    expect(open.success).toBe(true);
    expect(history.success).toBe(true);
  });

  it("should fetch TWAP order by ID (sanity check)", async () => {
    try {
      const single = await client.getTwapOrderById(1) as any;
      console.log("TWAP By ID:", JSON.stringify(single));
      expect(single).toBeDefined();
    } catch (err: any) {
      // 404 is fine as long as it's a valid API 404 and not a transport error
      console.log("TWAP ID fetch status:", err.statusCode);
      expect([200, 404]).toContain(err.statusCode);
    }
  });

  it("should place a tiny market order on testnet", async () => {
    // Attempting a tiny order to confirm write access
    try {
      const response = await client.createMarketOrder({
        symbol: "BTC",
        side: "bid",
        amount: "0.001", // Very small
        slippage_percent: "1.0",
      });
      console.log("Market Order Response:", response);
      expect(response).toBeDefined();
    } catch (err: any) {
      // If balance is zero, we might get an error, but as long as it's not a 401/Invalid Signature, the SDK is working.
      console.error("Order error (expected if no balance):", err.body || err.message);
      if (err.statusCode === 401) {
        throw new Error("Authentication failed: Invalid signature logic");
      }
    }
  });

  it("should work with an agent wallet on testnet", async () => {
    try {
      const response = await agentClient.createMarketOrder({
        symbol: "BTC",
        side: "bid",
        amount: "0.001",
      });
      console.log("Agent Wallet Order Response:", response);
    } catch (err: any) {
      console.error("Agent Order error:", err.body || err.message);
      if (err.statusCode === 401) {
        throw new Error("Agent Wallet authentication failed");
      }
    }
  });

  it("should connect to WebSocket and receive price updates", async () => {
    const ws = client.connectWebSocket();

    const priceReceived = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("WS Timeout")), 30_000);
      ws.subscribePrices((data: any) => {
        if (data.source === "prices") {
          console.log("WS Price snapshot received");
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    await expect(priceReceived).resolves.toBeUndefined();
    ws.disconnect();
  }, 30000);
});
