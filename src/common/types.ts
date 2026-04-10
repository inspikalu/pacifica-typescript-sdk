// ─── Primitives ──────────────────────────────────────────────────────────────

export type Side = "bid" | "ask";
export type Tif = "GTC" | "IOC" | "FOK";
export type Network = "mainnet" | "testnet";

// ─── Client Config ────────────────────────────────────────────────────────────

export interface PacificaClientConfig {
  /** Base58-encoded 64-byte Solana private key */
  privateKey: string;
  /** Optional agent wallet private key (base58). When set, all order signing
   *  uses this key while `account` in request headers remains the main account. */
  agentWalletPrivateKey?: string;
  /** mainnet (default) or testnet */
  network?: Network;
  /** Optional custom REST base URL. If set, overrides 'network' setting. */
  baseUrl?: string;
  /** Optional custom WebSocket URL. If set, overrides 'network' setting. */
  wsUrl?: string;
  /** Signature expiry window in ms. Default: 5000 */
  defaultExpiryWindow?: number;
}

// ─── Signing internals ────────────────────────────────────────────────────────

export interface SignatureHeader {
  type: string;
  timestamp: number;
  expiry_window: number;
}

export interface RequestHeader {
  account: string;
  signature: string;
  timestamp: number;
  expiry_window: number;
  agent_wallet?: string | null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface CreateMarketOrderParams {
  symbol: string;
  side: Side;
  /** Decimal string e.g. "0.1" */
  amount: string;
  reduce_only?: boolean;
  /** Slippage tolerance as a percentage string e.g. "0.5" */
  slippage_percent?: string;
  client_order_id?: string;
  /** Builder code (optional — for builder program fee attribution) */
  builder_code?: string;
}

export interface CreateLimitOrderParams {
  symbol: string;
  side: Side;
  /** Decimal string e.g. "0.1" */
  amount: string;
  /** Decimal string e.g. "100000" */
  price: string;
  reduce_only?: boolean;
  tif?: Tif;
  client_order_id?: string;
  builder_code?: string;
}

export interface CancelOrderParams {
  symbol: string;
  /** Either order_id or client_order_id must be provided */
  order_id?: number;
  client_order_id?: string;
}

export interface CancelAllOrdersParams {
  symbol?: string;
}

export type BatchOrderAction =
  | { type: "Create"; data: Record<string, unknown> }
  | { type: "Cancel"; data: Record<string, unknown> };

// ─── TWAP Orders ─────────────────────────────────────────────────────────────

export interface CreateTwapOrderParams {
  symbol: string;
  side: Side;
  amount: string;
  /** Duration in seconds for the TWAP to execute over */
  duration_in_seconds: number;
  reduce_only?: boolean;
  slippage_percent?: string;
  client_order_id?: string;
}

export interface CancelTwapOrderParams {
  symbol: string;
  order_id?: number;
  client_order_id?: string;
}

// ─── Positions ────────────────────────────────────────────────────────────────

export interface TpslOrder {
  stop_price: string;
  limit_price?: string;
  amount?: string;
  client_order_id?: string;
}

export interface SetPositionTpslParams {
  symbol: string;
  /** Direction of the TPSL orders (opposite of your position side) */
  side: Side;
  take_profit?: TpslOrder;
  stop_loss?: TpslOrder;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface UpdateLeverageParams {
  symbol: string;
  leverage: number;
}

export interface CreateSubaccountParams {
  /** Keypair or private key of the subaccount */
  subPrivateKey: string;
}

export interface TransferSubaccountFundsParams {
  to_account: string;
  amount: string;
}

// ─── Agent Wallets ────────────────────────────────────────────────────────────

export interface BindAgentWalletParams {
  agent_wallet: string;
}

// ─── API Config Keys ──────────────────────────────────────────────────────────

export interface RevokeApiConfigKeyParams {
  api_key: string;
}

// ─── Lake ─────────────────────────────────────────────────────────────────────

export interface CreateLakeParams {
  /** Public key of the lake manager account */
  manager: string;
  /** Optional nickname for the lake */
  nickname?: string;
}

export interface LakeDepositParams {
  lake_account: string;
  amount: string;
}

export interface LakeWithdrawParams {
  lake_account: string;
  amount: string;
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

export interface WsSubscribeParams {
  source: string;
  account?: string;
}

export interface WsActionMessage {
  id: string;
  params: Record<string, unknown>;
}
