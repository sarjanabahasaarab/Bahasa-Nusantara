/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA EXECUTABLE - Definisi Metadata Biner
 * Target Milestone: Phase 45 (v0.45.0)
 */

export interface BinarySectionInfo {
  name: string;
  offset: number;
  size: number;
  virtualAddress?: number;
  flags?: string;
}

export interface BinaryMetadata {
  filePath: string;
  format: 'ELF' | 'Mach-O' | 'COFF' | 'UNKNOWN';
  bits: 32 | 64 | 'UNKNOWN';
  architecture: 'x86_64' | 'aarch64' | 'x86' | 'arm' | 'UNKNOWN';
  endianness: 'little-endian' | 'big-endian' | 'UNKNOWN';
  operatingSystem: 'linux' | 'darwin' | 'windows' | 'unknown';
  entryPointAddress?: string;
  fileSizeBytes: number;
  sections: BinarySectionInfo[];
  importedSymbols: string[];
  exportedSymbols: string[];
  dynamicLibraries: string[];
  hasDebugInfo: boolean;
  isStripped: boolean;
  binaryType?: 'EXECUTABLE' | 'SHARED_LIB' | 'OBJECT' | 'SCRIPT' | 'UNKNOWN';
  isValidExecutable?: boolean;
  validationErrors?: string[];
}
