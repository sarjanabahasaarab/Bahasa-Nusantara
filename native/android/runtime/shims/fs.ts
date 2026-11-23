/** Browser-safe Node fs shim. Native filesystem access is intentionally unavailable. */
const unsupported = (): never => { throw new Error("Modul fs Node.js tidak tersedia pada runtime Android yang terisolasi."); };
export const existsSync = (_path: string): boolean => false;
export const readFileSync = unsupported;
export const writeFileSync = unsupported;
export const appendFileSync = unsupported;
export const mkdirSync = unsupported;
export const readdirSync = (_path: string): string[] => [];
export const statSync = unsupported;
export const lstatSync = unsupported;
export const unlinkSync = unsupported;
export const rmSync = unsupported;
export const copyFileSync = unsupported;
export const renameSync = unsupported;
export const accessSync = unsupported;
export const constants = Object.freeze({});
const realpathSync: any = unsupported;
realpathSync.native = unsupported;
export { realpathSync };
export const promises = Object.freeze({
  readFile: async () => unsupported(),
  writeFile: async () => unsupported(),
  readdir: async () => [],
  mkdir: async () => unsupported(),
  stat: async () => unsupported(),
});
export default { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, statSync, lstatSync, unlinkSync, rmSync, copyFileSync, renameSync, accessSync, realpathSync, constants, promises };
