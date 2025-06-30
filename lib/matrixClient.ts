import * as sdk from "matrix-js-sdk";
import * as Olm from "@matrix-org/olm";
import type { MatrixClient } from "matrix-js-sdk/lib/client";

// Singleton
let matrixClient: MatrixClient | null = null;

export async function initMatrixClient(
  abortControllerRef?: AbortController
): Promise<MatrixClient> {
  if (matrixClient) return matrixClient;

  // Check browser support
  if (typeof indexedDB === "undefined" || !window.crypto?.subtle) {
    throw new Error("Your browser does not support required encryption features");
  }

  try {
    // Initialize OLM with WASM
    const wasmResponse = await fetch('/api/olm-wasm');
    if (!wasmResponse.ok) {
      throw new Error('Failed to load OLM WASM file');
    }
    const wasmBinary = await wasmResponse.arrayBuffer();
    await Olm.init({ wasmBinary });
    console.log("✅ OLM initialized successfully");
  } catch (err) {
    console.error("OLM initialization failed:", err);
    throw new Error("Could not initialize encryption support");
  }

  // Get authentication tokens
  const res = await fetch("/api/get-matrix-token");
  if (!res.ok) throw new Error("Not authenticated");
  const { access_token, user_id, device_id } = await res.json();
  if (!access_token || !user_id) {
    throw new Error("Missing access token or user ID");
  }

  // Create client instance
  const client = sdk.createClient({
    baseUrl: "https://matrix.social.sequoiasupport.com:8448",
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id || `web_${Date.now()}`,
    timelineSupport: true,
    useAuthorizationHeader: true,
    cryptoStore: new sdk.IndexedDBCryptoStore(
      indexedDB,
      "matrix-js-sdk-crypto-store"
    ),
    store: new sdk.IndexedDBStore({
      indexedDB: window.indexedDB,
      localStorage: window.localStorage,
      dbName: "matrix-js-sdk-store",
    }),
    // @ts-expect-error - not typed but works
    lazyLoadMembers: true,
    fetchFn: (url, options) => {
      return fetch(url, {
        ...options,
        signal: abortControllerRef?.signal
      });
    }
  });

  // Initialize store
  await client.store.startup();
  const accessToken = client.getAccessToken();

  // Initialize crypto if available
  if (client.initCrypto) {
    try {
      await client.initCrypto();
      console.log("✅ Encryption initialized");
    } catch (err) {
      console.warn("⚠️ Failed to initialize encryption:", err);
      // Continue without encryption if it fails
    }
  }

  if (client.isCryptoEnabled()) {
    try {
      await client.bootstrapCrossSigning({
        setupNewCrossSigning: true,
        // @ts-expect-error: auth is supported at runtime even though not in type
        auth: async (makeRequest) => {
          return makeRequest({
            type: "m.login.token",
            identifier: {
              type: "m.id.user",
              user: client.getUserId()!,
            },
            token: accessToken,
          });
        },
      });
      console.log("✅ Cross-signing bootstrap completed.");
    } catch (err) {
      console.error("❌ Failed to bootstrap cross-signing:", err);
    }
  }

  // Set up sync listener with proper typing
  await new Promise<void>((resolve, reject) => {
    const onSync = (state: string, prevState: string | null) => {
      if (state === "PREPARED") {
        client.removeListener("sync" as any, onSync);
        resolve();
      } else if (state === "ERROR") {
        client.removeListener("sync" as any, onSync);
        reject(new Error("Sync failed"));
      }
    };

    client.on("sync" as any, onSync);
    client.startClient();

    // Timeout after 30 seconds
    setTimeout(() => {
      client.removeListener("sync" as any, onSync);
      reject(new Error("Sync timed out"));
    }, 30000);
  });

  matrixClient = client;
  return client;
}
