/** Node child_process shim: process execution is never available in mobile WebView. */
const unsupported = (): never => { throw new Error("Eksekusi proses sistem tidak tersedia pada runtime Android WebView."); };
export const spawn = unsupported;
export const exec = unsupported;
export const execFile = unsupported;
export const fork = unsupported;
export const spawnSync = unsupported;
export const execSync = unsupported;
export const execFileSync = unsupported;
export default { spawn, exec, execFile, fork, spawnSync, execSync, execFileSync };
