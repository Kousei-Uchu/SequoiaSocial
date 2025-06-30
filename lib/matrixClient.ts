import * as sdk from "matrix-js-sdk";
import * as Olm from "@matrix-org/olm";
import type { MatrixClient } from "matrix-js-sdk/lib/client";
import type { ISecretStorageKeyInfo } from "matrix-js-sdk/lib/crypto/api";

// Singleton
let matrixClient: MatrixClient | null = null;
let olmInitialized = false;

export type { MatrixClient };

// Define the cross-signing options type
interface IBootstrapCrossSigningOpts {
    setupNewCrossSigning: boolean;
    authUploadDeviceSigningKeys?: (
        makeRequest: (authData: any) => Promise<any>
    ) => Promise<any>;
    keyBackupInfo?: ISecretStorageKeyInfo;
}

export async function initMatrixClient(
  abortControllerRef?: AbortController
): Promise<MatrixClient> {
  if (matrixClient) return matrixClient;

  // Check browser support
  if (typeof indexedDB === "undefined") {
    throw new Error("Your browser doesn't support IndexedDB which is required for data storage");
  }
  
  if (!window.crypto?.subtle) {
    throw new Error("Your browser doesn't support Web Crypto API which is required for encryption");
  }

  // Initialize OLM
  if (!olmInitialized) {
    try {
      await initializeOLM(abortControllerRef);
      olmInitialized = true;
    } catch (err) {
      console.error("OLM initialization failed, continuing without encryption:", err);
    }
  }

  // Get authentication tokens
  let access_token: string, user_id: string, device_id: string | undefined;
  try {
    const res = await fetch("/api/get-matrix-token", {
      signal: abortControllerRef?.signal
    });
    
    if (!res.ok) {
      if (res.status === 401) throw new Error("Not authenticated - please login again");
      throw new Error(`Failed to get access token: ${res.statusText}`);
    }
    
    const tokenData = await res.json();
    access_token = tokenData.access_token;
    user_id = tokenData.user_id;
    device_id = tokenData.device_id;
    
    if (!access_token || !user_id) {
      throw new Error("Server response missing required authentication data");
    }
  } catch (err) {
    console.error("Authentication failed:", err);
    throw new Error("Failed to authenticate with the server");
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
  try {
    await client.store.startup();
  } catch (err) {
    console.error("Failed to initialize store:", err);
    throw new Error("Failed to initialize local data storage");
  }

  // Initialize crypto if available
  if (olmInitialized && client.initCrypto) {
    try {
      await client.initCrypto();
      console.log("✅ Encryption initialized");
      
      // Initialize cross-signing if crypto is enabled
      if (client.isCryptoEnabled()) {
        await initializeCrossSigning(client, access_token);
      }
    } catch (err) {
      console.warn("⚠️ Failed to initialize encryption:", err);
    }
  }

  // Set up sync
  try {
    await startClientWithSync(client, abortControllerRef);
  } catch (err) {
    console.error("Failed to start client sync:", err);
    client.stopClient();
    throw new Error("Failed to establish connection with server");
  }

  matrixClient = client;
  return client;
}

async function initializeOLM(abortController?: AbortController): Promise<void> {
  try {
    const wasmResponse = await fetch('/api/olm-wasm', {
      signal: abortController?.signal
    });
    
    if (!wasmResponse.ok) {
      throw new Error(`Failed to load OLM WASM: ${wasmResponse.status}`);
    }
    
    const wasmBinary = await wasmResponse.arrayBuffer();
    await Olm.init({ wasmBinary });
    console.log("✅ OLM initialized successfully");
  } catch (err) {
    console.warn("First OLM initialization attempt failed, trying fallback:", err);
    
    try {
      await loadOLMFromCDN();
      console.log("✅ OLM initialized from fallback source");
    } catch (fallbackErr) {
      console.error("All OLM initialization attempts failed:", fallbackErr);
      throw new Error("Could not initialize encryption support");
    }
  }
}

async function loadOLMFromCDN(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@matrix-org/olm@3.2.4/olm.js';
    script.async = true;
    
    script.onload = async () => {
      try {
        await window.Olm.init();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load OLM script'));
    };
    
    document.body.appendChild(script);
  });
}

async function initializeCrossSigning(client: MatrixClient, accessToken: string): Promise<void> {
  try {
    const opts: IBootstrapCrossSigningOpts = {
      setupNewCrossSigning: true,
      authUploadDeviceSigningKeys: async (makeRequest) => {
        return makeRequest({
          type: "m.login.token",
          identifier: {
            type: "m.id.user",
            user: client.getUserId()!,
          },
          token: accessToken,
        });
      },
    };

    await client.bootstrapCrossSigning(opts);
    console.log("✅ Cross-signing bootstrap completed.");
  } catch (err) {
    console.error("❌ Failed to bootstrap cross-signing:", err);
  }
}

async function startClientWithSync(client: MatrixClient, abortController?: AbortController): Promise<void> {
  return new Promise((resolve, reject) => {
    const syncTimeout = setTimeout(() => {
      cleanup();
      reject(new Error("Sync timed out after 30 seconds"));
    }, 30000);

    const onSync = (state: string, prevState: string | null) => {
      if (state === "PREPARED") {
        cleanup();
        resolve();
      } else if (state === "ERROR") {
        cleanup();
        reject(new Error("Sync failed"));
      }
    };

    const cleanup = () => {
      client.removeListener("sync" as any, onSync);
      clearTimeout(syncTimeout);
    };

    client.on("sync" as any, onSync);
    
    abortController?.signal.addEventListener('abort', () => {
      cleanup();
      reject(new Error("Initialization was aborted"));
    });

    client.startClient({
      initialSyncLimit: 20,
    });
  });
}