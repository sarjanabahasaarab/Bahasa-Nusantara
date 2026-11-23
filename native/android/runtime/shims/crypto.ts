/** Node crypto shim: fail closed for APIs that require a native host adapter. */
const unsupported = (): never => { throw new Error("API kriptografi Node.js ini belum tersedia pada runtime Android WebView."); };
export const createHash = unsupported;
export const createHmac = unsupported;
export const randomBytes = unsupported;
export const randomFillSync = unsupported;
export const pbkdf2Sync = unsupported;
export const scryptSync = unsupported;
export const timingSafeEqual = unsupported;
export const createCipheriv = unsupported;
export const createDecipheriv = unsupported;
export const generateKeyPairSync = unsupported;
export const sign = unsupported;
export const verify = unsupported;
export const randomUUID = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) return cryptoApi.randomUUID();
  return unsupported();
};
export default { createHash, createHmac, randomBytes, randomFillSync, pbkdf2Sync, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, generateKeyPairSync, sign, verify, randomUUID };
