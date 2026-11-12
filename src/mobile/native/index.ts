/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 38
 * Pintu Masuk Integrasi Native API & Perangkat (Native Device API Entry)
 */

import { RegistriNativeAPI } from './core/registry';
import { inisialisasiSemuaLayananNativeAPI } from './services/init_all_services';

export * from './core/result';
export * from './core/capabilities';
export * from './core/events';
export * from './core/registry';
export * from './core/hardware_probe';
export * from './codegen/native_device_codegen';
export * from './adapters';

// Inisialisasi otomatis semua API native saat modul dimuat
inisialisasiSemuaLayananNativeAPI(RegistriNativeAPI.dapatkanInstance());
