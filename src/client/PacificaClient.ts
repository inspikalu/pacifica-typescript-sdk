import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { v4 as uuidv4 } from "uuid";
import {
  REST_URL,
  TESTNET_REST_URL,
  SOLANA_RPC_URL,
  PROGRAM_ID,
  CENTRAL_STATE,
  PACIFICA_VAULT,
  USDC_MINT,
  DEFAULT_EXPIRY_WINDOW,
} from "../common/constants.js";
import { signMessage, createKeypairFromPrivateKey } from "../common/signing.js";
import { post, get } from "./http.js";
import { PacificaWebSocketClient } from "./PacificaWebSocketClient.js";
import type {
  PacificaClientConfig,
  SignatureHeader,
  RequestHeader,
  CreateMarketOrderParams,
  CreateLimitOrderParams,
  CancelOrderParams,
  CancelAllOrdersParams,
  BatchOrderAction,
  CreateTwapOrderParams,
  CancelTwapOrderParams,
  SetPositionTpslParams,
  UpdateLeverageParams,
  CreateSubaccountParams,
  TransferSubaccountFundsParams,
  CreateLakeParams,
  LakeDepositParams,
  LakeWithdrawParams,
  RevokeApiConfigKeyParams,
} from "../common/types.js";
import crypto from "crypto";

// ─── PacificaClient ───────────────────────────────────────────────────────────

export class PacificaClient {
  private readonly keypair: Keypair;
  private readonly agentKeypair: Keypair | undefined;
  private readonly publicKey: string;
  private readonly baseUrl: string;
  private readonly wsUrl: string | undefined;
  private readonly expiryWindow: number;

  constructor(config: PacificaClientConfig) {
    this.keypair = createKeypairFromPrivateKey(config.privateKey);
    this.publicKey = this.keypair.publicKey.toBase58();
    
    // URL Priority: Custom URL > Network Toggle > Factory Default
    this.baseUrl = config.baseUrl ?? (config.network === "testnet" ? TESTNET_REST_URL : REST_URL);
    this.wsUrl = config.wsUrl;
    
    this.expiryWindow = config.defaultExpiryWindow ?? DEFAULT_EXPIRY_WINDOW;

    if (config.agentWalletPrivateKey) {
      this.agentKeypair = createKeypairFromPrivateKey(config.agentWalletPrivateKey);
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /** Returns the signing keypair — agent wallet if configured, otherwise main keypair */
  private getSigningKeypair(): Keypair {
    return this.agentKeypair ?? this.keypair;
  }

  /** Builds a signed request body ready to POST. */
  private buildSignedRequest(
    type: string,
    payload: object,
    extraHeaders: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const timestamp = Date.now();
    const signingKeypair = this.getSigningKeypair();

    const header: SignatureHeader = {
      type,
      timestamp,
      expiry_window: this.expiryWindow,
    };

    const { signature } = signMessage(header, payload, signingKeypair);

    const requestHeader: RequestHeader = {
      account: this.publicKey,
      signature,
      timestamp,
      expiry_window: this.expiryWindow,
      ...(this.agentKeypair
        ? { agent_wallet: this.agentKeypair.publicKey.toBase58() }
        : {}),
      ...extraHeaders,
    };

    return { ...requestHeader, ...payload };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  /**
   * Place a market order.
   * @example
   * await client.createMarketOrder({ symbol: "BTC", side: "bid", amount: "0.1" });
   */
  async createMarketOrder<T = unknown>(params: CreateMarketOrderParams): Promise<T> {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      reduce_only: params.reduce_only ?? false,
      slippage_percent: params.slippage_percent ?? "0.5",
      client_order_id: params.client_order_id ?? uuidv4(),
      ...(params.builder_code ? { builder_code: params.builder_code } : {}),
    };
    const body = this.buildSignedRequest("create_market_order", payload);
    return post<T>(this.url("/orders/create_market"), body);
  }

  /**
   * Place a limit order.
   * @example
   * await client.createLimitOrder({ symbol: "BTC", side: "bid", amount: "0.1", price: "100000" });
   */
  async createLimitOrder<T = unknown>(params: CreateLimitOrderParams): Promise<T> {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      price: params.price,
      reduce_only: params.reduce_only ?? false,
      tif: params.tif ?? "GTC",
      client_order_id: params.client_order_id ?? uuidv4(),
      ...(params.builder_code ? { builder_code: params.builder_code } : {}),
    };
    const body = this.buildSignedRequest("create_order", payload);
    return post<T>(this.url("/orders/create"), body);
  }

  /**
   * Cancel an order by order_id or client_order_id.
   */
  async cancelOrder<T = unknown>(params: CancelOrderParams): Promise<T> {
    const payload: Record<string, unknown> = { symbol: params.symbol };
    if (params.order_id !== undefined) payload.order_id = params.order_id;
    if (params.client_order_id !== undefined) payload.client_order_id = params.client_order_id;
    const body = this.buildSignedRequest("cancel_order", payload);
    return post<T>(this.url("/orders/cancel"), body);
  }

  /**
   * Cancel all open orders. Pass a symbol to cancel only for that market.
   */
  async cancelAllOrders<T = unknown>(params: CancelAllOrdersParams = {}): Promise<T> {
    const payload: Record<string, unknown> = {};
    if (params.symbol) payload.symbol = params.symbol;
    const body = this.buildSignedRequest("cancel_all_orders", payload);
    return post<T>(this.url("/orders/cancel_all"), body);
  }

  /**
   * Submit multiple order actions (Create/Cancel) atomically.
   *
   * Each action must be constructed with `buildCreateOrderAction` or
   * `buildCancelOrderAction` helpers, or built manually.
   */
  async batchOrders<T = unknown>(actions: BatchOrderAction[]): Promise<T> {
    return post<T>(this.url("/orders/batch"), { actions });
  }

  /**
   * Helper to build a signed Create action for use with `batchOrders`.
   */
  buildCreateOrderAction(params: CreateLimitOrderParams): BatchOrderAction {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      price: params.price,
      reduce_only: params.reduce_only ?? false,
      tif: params.tif ?? "GTC",
      client_order_id: params.client_order_id ?? uuidv4(),
    };
    const data = this.buildSignedRequest("create_order", payload);
    return { type: "Create", data };
  }

  /**
   * Helper to build a signed Cancel action for use with `batchOrders`.
   */
  buildCancelOrderAction(params: CancelOrderParams): BatchOrderAction {
    const payload: Record<string, unknown> = { symbol: params.symbol };
    if (params.order_id !== undefined) payload.order_id = params.order_id;
    if (params.client_order_id !== undefined) payload.client_order_id = params.client_order_id;
    const data = this.buildSignedRequest("cancel_order", payload);
    return { type: "Cancel", data };
  }

  /**
   * Set take-profit and/or stop-loss on an existing position.
   */
  async setPositionTpsl<T = unknown>(params: SetPositionTpslParams): Promise<T> {
    const payload: Record<string, unknown> = {
      symbol: params.symbol,
      side: params.side,
    };
    if (params.take_profit) payload.take_profit = params.take_profit;
    if (params.stop_loss) payload.stop_loss = params.stop_loss;
    const body = this.buildSignedRequest("set_position_tpsl", payload);
    return post<T>(this.url("/positions/tpsl"), body);
  }

  // ─── TWAP Orders ────────────────────────────────────────────────────────────

  /**
   * Create a TWAP (Time-Weighted Average Price) order.
   */
  async createTwapOrder<T = unknown>(params: CreateTwapOrderParams): Promise<T> {
    const payload = {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      duration_in_seconds: params.duration_in_seconds,
      reduce_only: params.reduce_only ?? false,
      slippage_percent: params.slippage_percent ?? "0.5",
      client_order_id: params.client_order_id ?? uuidv4(),
    };
    const body = this.buildSignedRequest("create_twap_order", payload);
    return post<T>(this.url("/orders/twap/create"), body);
  }

  /**
   * Cancel an active TWAP order.
   */
  async cancelTwapOrder<T = unknown>(params: CancelTwapOrderParams): Promise<T> {
    const payload: Record<string, unknown> = { symbol: params.symbol };
    if (params.order_id !== undefined) payload.order_id = params.order_id;
    if (params.client_order_id !== undefined) payload.client_order_id = params.client_order_id;
    const body = this.buildSignedRequest("cancel_twap_order", payload);
    return post<T>(this.url("/orders/twap/cancel"), body);
  }

  /** Get all open TWAP orders for this account. */
  async getOpenTwapOrders<T = unknown>(): Promise<T> {
    return get<T>(this.url(`/orders/twap?account=${this.publicKey}`));
  }

  /** Get TWAP order history for this account. */
  async getTwapOrderHistory<T = unknown>(): Promise<T> {
    return get<T>(this.url(`/orders/twap/history?account=${this.publicKey}`));
  }

  /** Get a specific TWAP order by ID. */
  async getTwapOrderById<T = unknown>(id: string | number): Promise<T> {
    return get<T>(this.url(`/orders/twap/history_by_id?order_id=${id}`));
  }

  // ─── Account ────────────────────────────────────────────────────────────────

  /**
   * Update leverage for a symbol.
   */
  async updateLeverage<T = unknown>(params: UpdateLeverageParams): Promise<T> {
    const payload = { symbol: params.symbol, leverage: params.leverage };
    const body = this.buildSignedRequest("update_leverage", payload);
    return post<T>(this.url("/account/leverage"), body);
  }

  /**
   * Create a subaccount linked to this (main) account.
   *
   * Uses the cross-signature scheme: subaccount signs main pubkey,
   * main signs subaccount's signature — both verified server-side.
   */
  async createSubaccount<T = unknown>(params: CreateSubaccountParams): Promise<T> {
    const subKeypair = createKeypairFromPrivateKey(params.subPrivateKey);
    const subPublicKey = subKeypair.publicKey.toBase58();

    const timestamp = Date.now();
    const expiryWindow = this.expiryWindow;

    // Step 1: Subaccount signs main account's public key
    const subHeader: SignatureHeader = {
      type: "subaccount_initiate",
      timestamp,
      expiry_window: expiryWindow,
    };
    const { signature: subSignature } = signMessage(
      subHeader,
      { account: this.publicKey },
      subKeypair
    );

    // Step 2: Main account signs the subaccount's signature
    const mainHeader: SignatureHeader = {
      type: "subaccount_confirm",
      timestamp,
      expiry_window: expiryWindow,
    };
    const { signature: mainSignature } = signMessage(
      mainHeader,
      { signature: subSignature },
      this.keypair
    );

    const body = {
      main_account: this.publicKey,
      subaccount: subPublicKey,
      main_signature: mainSignature,
      sub_signature: subSignature,
      timestamp,
      expiry_window: expiryWindow,
    };

    return post<T>(this.url("/account/subaccount/create"), body);
  }

  /** List all subaccounts linked to this account. */
  async listSubaccounts<T = unknown>(): Promise<T> {
    const payload = {};
    const body = this.buildSignedRequest("list_subaccounts", payload);
    return post<T>(this.url("/account/subaccount/list"), body);
  }

  /**
   * Transfer funds between main account and a subaccount (or vice versa).
   */
  async transferSubaccountFunds<T = unknown>(
    params: TransferSubaccountFundsParams
  ): Promise<T> {
    const payload = { to_account: params.to_account, amount: params.amount };
    const body = this.buildSignedRequest("transfer_funds", payload);
    return post<T>(this.url("/account/subaccount/transfer"), body);
  }

  // ─── Agent Wallets ──────────────────────────────────────────────────────────

  /**
   * Bind an agent wallet to this account. Once bound, the agent wallet can
   * sign orders on behalf of this account without the main private key.
   *
   * @param agentWalletPublicKey - The agent wallet's public key (base58)
   */
  async bindAgentWallet<T = unknown>(agentWalletPublicKey: string): Promise<T> {
    const payload = { agent_wallet: agentWalletPublicKey };
    const body = this.buildSignedRequest("bind_agent_wallet", payload);
    return post<T>(this.url("/agent/bind"), body);
  }

  // ─── API Config Keys ────────────────────────────────────────────────────────

  /**
   * Create a new API config key for this account.
   * Returns an API key that can be used for rate-limited access.
   */
  async createApiConfigKey<T = unknown>(): Promise<T> {
    const payload = {};
    const body = this.buildSignedRequest("create_api_key", payload);
    // API config key endpoint requires agent_wallet: null explicitly
    (body as Record<string, unknown>).agent_wallet =
      (body as Record<string, unknown>).agent_wallet ?? null;
    return post<T>(this.url("/account/api_keys/create"), body);
  }

  /**
   * Revoke an existing API config key.
   */
  async revokeApiConfigKey<T = unknown>(params: RevokeApiConfigKeyParams): Promise<T> {
    const payload = { api_key: params.api_key };
    const body = this.buildSignedRequest("revoke_api_key", payload);
    (body as Record<string, unknown>).agent_wallet =
      (body as Record<string, unknown>).agent_wallet ?? null;
    return post<T>(this.url("/account/api_keys/revoke"), body);
  }

  /**
   * List all API config keys for this account.
   */
  async listApiConfigKeys<T = unknown>(): Promise<T> {
    const payload = {};
    const body = this.buildSignedRequest("list_api_keys", payload);
    (body as Record<string, unknown>).agent_wallet =
      (body as Record<string, unknown>).agent_wallet ?? null;
    return post<T>(this.url("/account/api_keys"), body);
  }

  // ─── Lake ───────────────────────────────────────────────────────────────────

  /**
   * Create a new Lake (a managed sub-pool on Pacifica).
   */
  async createLake<T = unknown>(params: CreateLakeParams): Promise<T> {
    const payload: Record<string, unknown> = { manager: params.manager };
    if (params.nickname) payload.nickname = params.nickname;
    const body = this.buildSignedRequest("create_lake", payload);
    return post<T>(this.url("/lake/create"), body);
  }

  /**
   * Deposit funds into a Lake.
   */
  async lakeDeposit<T = unknown>(params: LakeDepositParams): Promise<T> {
    const payload = { lake_account: params.lake_account, amount: params.amount };
    const body = this.buildSignedRequest("lake_deposit", payload);
    return post<T>(this.url("/lake/deposit"), body);
  }

  /**
   * Withdraw funds from a Lake.
   */
  async lakeWithdraw<T = unknown>(params: LakeWithdrawParams): Promise<T> {
    const payload = { lake_account: params.lake_account, amount: params.amount };
    const body = this.buildSignedRequest("lake_withdraw", payload);
    return post<T>(this.url("/lake/withdraw"), body);
  }

  // ─── On-chain Deposit ───────────────────────────────────────────────────────

  /**
   * Deposit USDC into Pacifica by sending an on-chain Solana transaction.
   * This calls the Pacifica Anchor program directly.
   *
   * @param amount - USDC amount (e.g. 100.5 = $100.50). Minimum is 10 USDC.
   * @param rpcUrl - Optional custom RPC URL. Defaults to mainnet-beta.
   * @returns Transaction signature string
   */
  async deposit(amount: number, rpcUrl?: string): Promise<string> {
    const connection = new Connection(rpcUrl ?? SOLANA_RPC_URL, "confirmed");

    const programId = new PublicKey(PROGRAM_ID);
    const centralState = new PublicKey(CENTRAL_STATE);
    const pacificaVault = new PublicKey(PACIFICA_VAULT);
    const usdcMint = new PublicKey(USDC_MINT);
    const sysProgram = new PublicKey("11111111111111111111111111111111");

    // Derive user's USDC associated token account
    const userUsdcAta = PublicKey.findProgramAddressSync(
      [
        this.keypair.publicKey.toBytes(),
        TOKEN_PROGRAM_ID.toBytes(),
        usdcMint.toBytes(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];

    // Derive the event authority PDA
    const [eventAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      programId
    );

    // Build Borsh-encoded instruction data
    // discriminator = sha256("global:deposit")[:8]  +  U64 amount (little-endian)
    const discriminator = crypto
      .createHash("sha256")
      .update("global:deposit")
      .digest()
      .slice(0, 8);

    const amountLamports = BigInt(Math.round(amount * 1_000_000)); // 6 decimals
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(amountLamports);

    const data = Buffer.concat([discriminator, amountBuffer]);

    const keys: AccountMeta[] = [
      { pubkey: this.keypair.publicKey, isSigner: true, isWritable: true },  // depositor
      { pubkey: userUsdcAta, isSigner: false, isWritable: true },             // depositorUsdcAccount
      { pubkey: centralState, isSigner: false, isWritable: true },
      { pubkey: pacificaVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: usdcMint, isSigner: false, isWritable: false },
      { pubkey: sysProgram, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ];

    const ix = new TransactionInstruction({ programId, keys, data });
    const tx = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.keypair.publicKey;

    const signature = await connection.sendTransaction(tx, [this.keypair]);
    return signature;
  }

  // ─── WebSocket ──────────────────────────────────────────────────────────────

  /**
   * Open a WebSocket connection and return a `PacificaWebSocketClient`.
   *
   * @example
   * const ws = client.connectWebSocket();
   * ws.subscribePrices((data) => console.log(data));
   *
   * // When done:
   * ws.disconnect();
   */
  connectWebSocket(): PacificaWebSocketClient {
    return new PacificaWebSocketClient({
      keypair: this.keypair,
      agentKeypair: this.agentKeypair,
      publicKey: this.publicKey,
      network: this.baseUrl === REST_URL ? "mainnet" : "testnet",
      url: this.wsUrl, // Pass custom URL through if set
      expiryWindow: this.expiryWindow,
    });
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  /** Returns the main account's public key as a base58 string. */
  getPublicKey(): string {
    return this.publicKey;
  }

  /** Returns the agent wallet's public key if configured. */
  getAgentWalletPublicKey(): string | undefined {
    return this.agentKeypair?.publicKey.toBase58();
  }
}
