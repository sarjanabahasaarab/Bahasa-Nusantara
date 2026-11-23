/** Node HTTP shim. Android WebView runtime intentionally has no server/socket host API. */
const unsupported = (): never => { throw new Error("Server HTTP Node.js tidak tersedia pada runtime Android WebView."); };
export const createServer = unsupported;
export const request = unsupported;
export const get = unsupported;
export const Agent = class { constructor() { unsupported(); } };
export const Server = class { constructor() { unsupported(); } };
export const IncomingMessage = class {};
export const ServerResponse = class {};
export default { createServer, request, get, Agent, Server, IncomingMessage, ServerResponse };
