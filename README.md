# pacifica-sdk

Official TypeScript SDK for the [Pacifica](https://app.pacifica.fi) perpetuals exchange.

Supports the full REST API, WebSocket API, and on-chain USDC deposits — with full TypeScript types, proper error handling, and an ergonomic client interface.

## Installation

```bash
npm install pacifica-sdk
```

## Quick Start

```ts
import { PacificaClient } from "pacifica-sdk";

const client = new PacificaClient({
  privateKey: "YOUR_BASE58_PRIVATE_KEY",
});

// Place a market order
const response = await client.createMarketOrder({
  symbol: "BTC",
  side: "bid",
  amount: "0.1",
});
```

## Authentication

All authenticated requests are signed using Ed25519 — the same signing scheme as the Python SDK. Your `privateKey` is a base58-encoded 64-byte Solana private key (same format as in Phantom/Solflare exports).

### Agent Wallets

Agent wallets let a "hot" key sign orders without exposing your main private key at runtime:

```ts
// Step 1: Bind the agent wallet (one-time, signed by main key)
const mainClient = new PacificaClient({ privateKey: MAIN_PRIVATE_KEY });
await mainClient.bindAgentWallet(agentPublicKey);

// Step 2: Use agent wallet for all subsequent operations
const client = new PacificaClient({
  privateKey: MAIN_PRIVATE_KEY,
  agentWalletPrivateKey: AGENT_PRIVATE_KEY,
});
```

## API Reference

### Constructor

```ts
new PacificaClient({
  privateKey: string;            // base58 Solana private key (required)
  agentWalletPrivateKey?: string; // agent wallet key — signs orders on behalf of account
  network?: "mainnet" | "testnet"; // default: "mainnet"
  baseUrl?: string;               // optional custom REST URL (overrides network)
  wsUrl?: string;                // optional custom WS URL (overrides network)
  defaultExpiryWindow?: number;  // signature expiry in ms, default: 5000
})
```

---

### Orders

#### `createMarketOrder(params)`
```ts
await client.createMarketOrder({
  symbol: "BTC",
  side: "bid" | "ask",
  amount: "0.1",             // decimal string
  reduce_only?: false,
  slippage_percent?: "0.5",  // default: "0.5"
  client_order_id?: string,  // auto-generated if omitted
  builder_code?: string,
});
```

#### `createLimitOrder(params)`
```ts
await client.createLimitOrder({
  symbol: "BTC",
  side: "bid" | "ask",
  amount: "0.1",
  price: "100000",
  tif?: "GTC" | "IOC" | "FOK",  // default: "GTC"
  reduce_only?: false,
  client_order_id?: string,
  builder_code?: string,
});
```

#### `cancelOrder(params)`
```ts
await client.cancelOrder({ symbol: "BTC", order_id: 42069 });
// or
await client.cancelOrder({ symbol: "BTC", client_order_id: "uuid-here" });
```

#### `cancelAllOrders(params?)`
```ts
await client.cancelAllOrders();            // all markets
await client.cancelAllOrders({ symbol: "BTC" }); // BTC only
```

#### `batchOrders(actions)`
Build and submit multiple signed actions atomically:
```ts
const actions = [
  client.buildCreateOrderAction({ symbol: "BTC", side: "bid", amount: "0.1", price: "100000" }),
  client.buildCancelOrderAction({ symbol: "BTC", order_id: 42069 }),
];
await client.batchOrders(actions);
```

#### `setPositionTpsl(params)`
```ts
await client.setPositionTpsl({
  symbol: "BTC",
  side: "ask",  // opposite direction from your position
  take_profit: { stop_price: "120000", limit_price: "120300", amount: "0.1" },
  stop_loss: { stop_price: "99800" }, // omit limit_price = market at trigger
});
```

---

### TWAP Orders

```ts
await client.createTwapOrder({ symbol: "BTC", side: "bid", amount: "1", duration_in_seconds: 180 });
await client.cancelTwapOrder({ symbol: "BTC", order_id: 123 });
await client.getOpenTwapOrders();
await client.getTwapOrderHistory();
await client.getTwapOrderById(123);
```

---

### Account

```ts
await client.updateLeverage({ symbol: "BTC", leverage: 20 });
await client.createSubaccount({ subPrivateKey: SUB_PRIVATE_KEY });
await client.listSubaccounts();
await client.transferSubaccountFunds({ to_account: "...", amount: "100" });
```

---

### Agent Wallets

```ts
await client.bindAgentWallet(agentWalletPublicKey);
```

---

### API Config Keys

```ts
const { data: { api_key } } = await client.createApiConfigKey();
await client.listApiConfigKeys();
await client.revokeApiConfigKey({ api_key });
```

---

### Lakes

```ts
await client.createLake({ manager: client.getPublicKey(), nickname: "My Lake" });
await client.lakeDeposit({ lake_account: "...", amount: "100" });
await client.lakeWithdraw({ lake_account: "...", amount: "50" });
```

---

### On-chain Deposit

Deposit USDC directly into Pacifica by sending a Solana transaction:

```ts
const txSignature = await client.deposit(100); // deposit 100 USDC
console.log("https://solscan.io/tx/" + txSignature);
```

---

### WebSocket

```ts
const ws = client.connectWebSocket();

// Subscriptions (no auth required)
await ws.subscribePrices((data) => console.log(data));
await ws.subscribeTwapOrders(accountPubkey, (data) => console.log(data));
await ws.subscribeTwapOrderUpdates(accountPubkey, (data) => console.log(data));

// Authenticated actions
const response = await ws.createMarketOrder({ symbol: "BTC", side: "bid", amount: "0.1" });
const response = await ws.createLimitOrder({ symbol: "BTC", side: "bid", amount: "0.1", price: "100000" });
const response = await ws.cancelOrder({ symbol: "BTC", order_id: 123 });
const response = await ws.cancelAllOrders({ symbol: "BTC" });

// Cleanup
ws.disconnect();
```

---

## Running Examples

```bash
# REST examples
npx tsx examples/rest/create_market_order.ts
npx tsx examples/rest/create_subaccount.ts
npx tsx examples/rest/deposit.ts

# WebSocket examples
npx tsx examples/ws/subscribe_prices.ts
npx tsx examples/ws/create_market_order.ts
```

Set your `PRIVATE_KEY` in the example file before running.

## Testnet

```ts
const client = new PacificaClient({
  privateKey: PRIVATE_KEY,
  network: "testnet",
});
```

- REST: `https://test-api.pacifica.fi/api/v1`
- WS: `wss://test-ws.pacifica.fi/ws`

### Custom Environments (Devnet/Local)

You can point the SDK anywhere (useful for local development or private devnets):

```ts
const client = new PacificaClient({
  privateKey: PRIVATE_KEY,
  baseUrl: "http://localhost:8080/api/v1",
  wsUrl: "ws://localhost:8080/ws",
});
```

## Error Handling

```ts
import { PacificaError } from "pacifica-sdk";

try {
  await client.createMarketOrder({ ... });
} catch (err) {
  if (err instanceof PacificaError) {
    console.error("API error:", err.statusCode, err.body);
  }
}
```

## Build

```bash
npm run build       # compile to dist/
npm run typecheck   # type-check without emitting
```

## Links

- [Pacifica App](https://app.pacifica.fi)
- [API Documentation](https://pacifica.gitbook.io/docs/api-documentation/api)
- [Builder Program](https://pacifica.gitbook.io/docs/builder-program)
- [Python SDK](https://github.com/pacifica-fi/python-sdk)
