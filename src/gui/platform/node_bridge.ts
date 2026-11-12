/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36
 * Jembatan Modul Runtime Node.js yang Aman untuk Bundler Browser
 */

const isNodeRuntime =
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  Boolean(process?.versions?.node);

declare const require: ((id: string) => any) | undefined;

export function muatModulNode<T = any>(nama: string): T | null {
  if (!isNodeRuntime) return null;
  try {
    if (typeof require === 'function') {
      return require(nama);
    }
    const proc = (globalThis as any).process;
    if (proc && typeof proc.getBuiltinModule === 'function') {
      return proc.getBuiltinModule(nama);
    }
    if (proc && proc.mainModule && typeof proc.mainModule.require === 'function') {
      return proc.mainModule.require(nama);
    }
  } catch {
    return null;
  }
  return null;
}

export function apakahNodeRuntime(): boolean {
  return isNodeRuntime;
}
