// lib/matrixClient.js
import sdk from "matrix-js-sdk";

export function createClient(homeserverUrl, accessToken, userId) {
  return sdk.createClient({
    baseUrl: homeserverUrl,
    accessToken,
    userId,
  });
}