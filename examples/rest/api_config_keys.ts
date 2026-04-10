import { PacificaClient } from "../../src/index.js";

const PRIVATE_KEY = "";

async function main() {
  const client = new PacificaClient({ privateKey: PRIVATE_KEY });

  // Create a new API config key
  console.log("Creating API config key...");
  const createResponse = await client.createApiConfigKey() as { data: { api_key: string } };
  console.log(JSON.stringify(createResponse, null, 2));
  const apiKey = createResponse.data.api_key;

  // List all API config keys
  console.log("\nListing API config keys...");
  const listResponse = await client.listApiConfigKeys();
  console.log(JSON.stringify(listResponse, null, 2));

  // Revoke the key we just created
  console.log(`\nRevoking key ${apiKey}...`);
  const revokeResponse = await client.revokeApiConfigKey({ api_key: apiKey });
  console.log(JSON.stringify(revokeResponse, null, 2));

  // Confirm revocation
  console.log("\nListing API config keys after revocation...");
  const finalList = await client.listApiConfigKeys();
  console.log(JSON.stringify(finalList, null, 2));
}

main().catch(console.error);
