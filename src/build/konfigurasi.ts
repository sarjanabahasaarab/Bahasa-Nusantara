/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Konfigurasi Matriks Platform & Target Build
 */

import { PlatformTarget, PLATFORM_SEMUA } from './types';

export interface InfoPlatform {
  target: PlatformTarget;
  os: 'linux' | 'windows' | 'macos' | 'web';
  arsitektur: 'x64' | 'arm64' | 'wasm';
  ekstensiBiner: string;
  formatArsip: 'tar.gz' | 'zip';
  runnerCI: string;
}

export const MATRIKS_PLATFORM: Record<PlatformTarget, InfoPlatform> = {
  'linux-x64': {
    target: 'linux-x64',
    os: 'linux',
    arsitektur: 'x64',
    ekstensiBiner: '',
    formatArsip: 'tar.gz',
    runnerCI: 'ubuntu-latest',
  },
  'linux-arm64': {
    target: 'linux-arm64',
    os: 'linux',
    arsitektur: 'arm64',
    ekstensiBiner: '',
    formatArsip: 'tar.gz',
    runnerCI: 'ubuntu-24.04-arm',
  },
  'windows-x64': {
    target: 'windows-x64',
    os: 'windows',
    arsitektur: 'x64',
    ekstensiBiner: '.exe',
    formatArsip: 'zip',
    runnerCI: 'windows-latest',
  },
  'macos-x64': {
    target: 'macos-x64',
    os: 'macos',
    arsitektur: 'x64',
    ekstensiBiner: '',
    formatArsip: 'tar.gz',
    runnerCI: 'macos-13',
  },
  'macos-arm64': {
    target: 'macos-arm64',
    os: 'macos',
    arsitektur: 'arm64',
    ekstensiBiner: '',
    formatArsip: 'tar.gz',
    runnerCI: 'macos-latest',
  },
  'web-wasm': {
    target: 'web-wasm',
    os: 'web',
    arsitektur: 'wasm',
    ekstensiBiner: '.wasm',
    formatArsip: 'tar.gz',
    runnerCI: 'ubuntu-latest',
  },
};

export function validasiPlatformTarget(target: string): target is PlatformTarget {
  return PLATFORM_SEMUA.includes(target as PlatformTarget);
}
