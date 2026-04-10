import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { Keypair } from "@solana/web3.js";
import { WS_URL, TESTNET_WS_URL, DEFAULT_EXPIRY_WINDOW } from "../common/constants.js";
import { signMessage } from "../common/signing.js";
import type { SignatureHeader, Network } from "../common/types.js";

interface PacificaWebSocketClientConfig {
  keypair: Keypair;
  agentKeypair?: Keypair;
  publicKey: string;
  network?: Network;
  url?: string; // Optional custom WS URL
  expiryWindow?: number;
}

type MessageHandler = (data: unknown) => void;

// ─── PacificaWebSocketClient ──────────────────────────────────────────────────

export class PacificaWebSocketClient {
  private readonly keypair: Keypair;
  private readonly agentKeypair: Keypair | undefined;
  private readonly publicKey: string;
  private readonly wsUrl: string;
  private readonly expiryWindow: number;

  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private connectionPromise: Promise<void> | null = null;

  constructor(config: PacificaWebSocketClientConfig) {
    this.keypair = config.keypair;
    this.agentKeypair = config.agentKeypair;
    this.publicKey = config.publicKey;
    // URL Priority: Custom URL > Network Toggle > Factory Default
    this.wsUrl = config.url ?? (config.network === "testnet" ? TESTNET_WS_URL : WS_URL);
    this.expiryWindow = config.expiryWindow ?? DEFAULT_EXPIRY_WINDOW;
  }

  // ── Connection management ───────────────────────────────────────────────────

  private connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl, { handshakeTimeout: 10_000 });

      this.ws.on("open", () => resolve());
      this.ws.on("error", (err) => reject(err));

      this.ws.on("message", (rawData: WebSocket.RawData) => {
        try {
          const text = rawData.toString();
          const parsed = JSON.parse(text);
          this.messageHandlers.forEach((handler) => handler(parsed));
        } catch {
          // non-JSON message — pass raw string
          this.messageHandlers.forEach((handler) => handler(rawData.toString()));
        }
      });

      this.ws.on("close", () => {
        this.connectionPromise = null;
        this.ws = null;
      });
    });

    return this.connectionPromise;
  }

  private async send(message: object): Promise<void> {
    await this.connect();
    this.ws!.send(JSON.stringify(message));
  }

  /** Register a handler for all incoming WebSocket messages. Useful for subscriptions. */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /** Close the WebSocket connection. */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connectionPromise = null;
  }

  // ── Signing helper ──────────────────────────────────────────────────────────

  private buildSignedPayload(type: string, payload: object) {
    const signingKeypair = this.agentKeypair ?? this.keypair;
    const timestamp = Date.now();

    const header: SignatureHeader = {
      type,
      timestamp,
      expiry_window: this.expiryWindow,
    };

    const { signature } = signMessage(header, payload, signingKeypair);

    return {
      account: this.publicKey,
      ...(this.agentKeypair
        ? { agent_wallet: this.agentKeypair.publicKey.toBase58() }
        : {}),
      signature,
      timestamp,
      expiry_window: this.expiryWindow,
      ...payload,
    };
  }

  // ── Subscriptions ────────────────────────────────────────────────────────────

  /**
   * Subscribe to live price updates (no authentication required).
   * @example
   * const ws = client.connectWebSocket();
   * ws.subscribePrices((data) => console.log(data));
   */
  async subscribePrices(handler: MessageHandler): Promise<void> {
    this.onMessage(handler);
    await this.send({ method: "subscribe", params: { source: "prices" } });
  }

  /**
   * Subscribe to TWAP order snapshots for an account.
   */
  async subscribeTwapOrders(account: string, handler: MessageHandler): Promise<void> {
    this.onMessage(handler);
    await this.send({
      method: "subscribe",
      params: { source: "account_twap_orders", account },
    });
  }

  /**
   * Subscribe to TWAP order update events for an account.
   */
  async subscribeTwapOrderUpdates(account: string, handler: MessageHandler): Promise<void> {
    this.onMessage(handler);
    await this.send({
      method: "subscribe",
      params: { source: "account_twap_order_updates", account },
    });
  }

  // ── Order Actions ────────────────────────────────────────────────────────────

  /**
   * Place a market order via WebSocket.
   */
  async createMarketOrder<T = unknown>(params: {
    symbol: string;
    side: "bid" | "ask";
    amount: string;
    reduce_only?: boolean;
    slippage_percent?: string;
    client_order_id?: string;
  }): Promise<T> {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      reduce_only: params.reduce_only ?? false,
      slippage_percent: params.slippage_percent ?? "0.5",
      client_order_id: params.client_order_id ?? uuidv4(),
    };

    const signedPayload = this.buildSignedPayload("create_market_order", payload);
    return this.sendAndReceive<T>("create_market_order", signedPayload);
  }

  /**
   * Place a limit order via WebSocket.
   */
  async createLimitOrder<T = unknown>(params: {
    symbol: string;
    side: "bid" | "ask";
    amount: string;
    price: string;
    reduce_only?: boolean;
    tif?: string;
    client_order_id?: string;
  }): Promise<T> {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      price: params.price,
      reduce_only: params.reduce_only ?? false,
      tif: params.tif ?? "GTC",
      client_order_id: params.client_order_id ?? uuidv4(),
    };

    const signedPayload = this.buildSignedPayload("create_order", payload);
    return this.sendAndReceive<T>("create_limit_order", signedPayload);
  }

  /**
   * Cancel an order via WebSocket.
   */
  async cancelOrder<T = unknown>(params: {
    symbol: string;
    order_id?: number;
    client_order_id?: string;
  }): Promise<T> {
    const payload: Record<string, unknown> = { symbol: params.symbol };
    if (params.order_id !== undefined) payload.order_id = params.order_id;
    if (params.client_order_id !== undefined) payload.client_order_id = params.client_order_id;

    const signedPayload = this.buildSignedPayload("cancel_order", payload);
    return this.sendAndReceive<T>("cancel_order", signedPayload);
  }

  /**
   * Cancel all open orders via WebSocket.
   */
  async cancelAllOrders<T = unknown>(params: { symbol?: string } = {}): Promise<T> {
    const payload: Record<string, unknown> = {};
    if (params.symbol) payload.symbol = params.symbol;

    const signedPayload = this.buildSignedPayload("cancel_all_orders", payload);
    return this.sendAndReceive<T>("cancel_all_orders", signedPayload);
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  /**
   * Send an action message and wait for the first response.
   */
  private async sendAndReceive<T>(actionName: string, payload: object): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const id = uuidv4();
      const wsMessage = { id, params: { [actionName]: payload } };

      const unsubscribe = this.onMessage((data) => {
        unsubscribe();
        resolve(data as T);
      });

      try {
        await this.send(wsMessage);
      } catch (err) {
        unsubscribe();
        reject(err);
      }

      // Timeout after 10s
      setTimeout(() => {
        unsubscribe();
        reject(new Error(`WebSocket action '${actionName}' timed out after 10s`));
      }, 10_000);
    });
  }
}
