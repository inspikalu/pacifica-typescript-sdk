import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import type { SignatureHeader } from "./types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively sort all object keys alphabetically — required for deterministic
 * signing. Matches Python's `sort_json_keys` exactly.
 */
function sortJsonKeys(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortJsonKeys(obj[key]);
    }
    return sorted;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map(sortJsonKeys);
  }
  return value;
}

/**
 * Build the compact, key-sorted JSON string that will be signed.
 * Mirrors Python's `prepare_message` exactly.
 */
export function prepareMessage(header: SignatureHeader, payload: object): string {
  if (!header.type || header.timestamp === undefined || header.expiry_window === undefined) {
    throw new Error("Header must have type, timestamp, and expiry_window");
  }
  const data = {
    ...header,
    data: payload,
  };
  const sorted = sortJsonKeys(data);
  // No spaces — compact JSON (separators=(',', ':') equivalent)
  return JSON.stringify(sorted);
}

// ─── Signing ─────────────────────────────────────────────────────────────────

export interface SignResult {
  message: string;
  signature: string;
}

/**
 * Sign a header+payload with a Solana Keypair using Ed25519.
 * Returns the signed message string and a base58-encoded signature.
 * Matches Python's `sign_message` exactly.
 */
export function signMessage(
  header: SignatureHeader,
  payload: object,
  keypair: Keypair
): SignResult {
  const message = prepareMessage(header, payload);
  const messageBytes = Buffer.from(message, "utf-8");
  const signatureBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signature = bs58.encode(signatureBytes);
  return { message, signature };
}

// ─── Keypair utils ────────────────────────────────────────────────────────────

/**
 * Create a Solana Keypair from a base58-encoded private key string.
 * Drop-in equivalent of Python's `Keypair.from_base58_string(PRIVATE_KEY)`.
 */
export function createKeypairFromPrivateKey(privateKey: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(privateKey));
}
