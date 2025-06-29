import * as sdk from "matrix-js-sdk";
import * as Olm from "@matrix-org/olm";
import type { MatrixClient } from "matrix-js-sdk/lib/client";

// Singleton
let matrixClient: MatrixClient | null = null;

export async function initMatrixClient(
  abortControllerRef?: AbortController
): Promise<MatrixClient> {
  if (matrixClient) return matrixClient;

  if (typeof indexedDB === "undefined" || !window.crypto?.subtle) {
    throw new Error("Your browser does not support required encryption features");
  }

  const res = await fetch("/api/get-matrix-token");
  if (!res.ok) throw new Error("Not authenticated");

  const { access_token, user_id, device_id } = await res.json();
  if (!access_token || !user_id) throw new Error("Missing access token or user ID");

  await Olm.init();

  const client = sdk.createClient({
    baseUrl: "https://matrix.social.sequoiasupport.com",
    accessToken: access_token,
    userId: user_id,
    deviceId: device_id || `web_${Date.now()}`,
    timelineSupport: true,
    useAuthorizationHeader: true,
    cryptoStore: new sdk.IndexedDBCryptoStore(indexedDB, "matrix-js-sdk-crypto-store"),
    store: new sdk.IndexedDBStore({
      indexedDB: window.indexedDB,
      localStorage: window.localStorage,
      dbName: "matrix-js-sdk-store",
    }),
    // @ts-expect-error - not typed but works
    lazyLoadMembers: true,
    fetchFn: (url, options) =>
      fetch(url, {
        ...options,
        signal: abortControllerRef?.signal,
      }),
  });

  await client.store.startup();

  try {
    await client.initCrypto();
    await client.bootstrapCrossSigning({
      authUploadDeviceSigningKeys: async (makeRequest) => {
        await makeRequest({});
      },
    });
    console.log("✅ Encryption initialized");
  } catch (err) {
    console.warn("⚠️ Failed to initialize encryption:", err);
  }

  // sync listener with safe casting
  await new Promise<void>((resolve) => {
    (client as any).once("sync", (state: string) => {
      if (state === "PREPARED") resolve();
    });
  });

  client.startClient();

  // Wait for sync to prepare
  await new Promise<void>((resolve) => {
    (client as any).once("sync", (state: string) => {
      if (state === "PREPARED") resolve();
    });
  });

  matrixClient = client;
  return client;
}
