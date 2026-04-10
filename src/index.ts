// Public API surface — everything a consumer needs
export { PacificaClient } from "./client/PacificaClient.js";
export { PacificaWebSocketClient } from "./client/PacificaWebSocketClient.js";
export { createKeypairFromPrivateKey, signMessage, prepareMessage } from "./common/signing.js";
export { PacificaError, PacificaNetworkError, PacificaSigningError } from "./errors/PacificaError.js";
export * from "./common/types.js";
export {
  REST_URL,
  WS_URL,
  TESTNET_REST_URL,
  TESTNET_WS_URL,
  DEFAULT_EXPIRY_WINDOW,
} from "./common/constants.js";
