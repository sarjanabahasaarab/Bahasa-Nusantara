/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Middleware Pencatat Akses HTTP Aman (Tanpa Kebocoran Data Sensitif).
 */

import { MiddlewareWeb } from '../jenis';

const PARAM_SENSITIF = new Set([
  'kata_sandi',
  'katasandi',
  'password',
  'sandi',
  'token',
  'rahasia',
  'secret',
  'kunci',
  'api_key',
  'apikey',
  'kredensial',
  'pin',
]);

export function sanitasiKueriAman(kueri: Record<string, string>): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const [k, v] of Object.entries(kueri)) {
    if (PARAM_SENSITIF.has(k.toLowerCase())) {
      hasil[k] = '[TERLINDUNGI]';
    } else {
      hasil[k] = v;
    }
  }
  return hasil;
}

export type FungsiPencatat = (pesan: string) => void;

export function buatMiddlewarePencatat(pencatat: FungsiPencatat = console.log): MiddlewareWeb {
  return async (req, res, lanjut) => {
    const waktuMulai = Date.now();
    try {
      await lanjut();
    } finally {
      const durasiMs = Date.now() - waktuMulai;
      const status = res.kodeStatus || 200;
      const kueriAman = sanitasiKueriAman(req.kueri);
      const queryStr = Object.keys(kueriAman).length > 0 ? `?${new URLSearchParams(kueriAman).toString()}` : '';
      pencatat(`[HTTP] ${req.metode} ${req.jalur}${queryStr} -> ${status} (${durasiMs}ms) [ID: ${req.id}]`);
    }
  };
}
