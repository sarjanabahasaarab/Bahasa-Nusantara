/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Middleware Pembatas Laju Permintaan (Rate Limiter) In-Memory.
 */

import { MiddlewareWeb } from '../jenis';

export interface OpsiPembatasLaju {
  jendelaMilidetik?: number; // default 60000 (1 menit)
  maksimalPermintaan?: number; // default 100 per jendela
  pesanGalat?: string;
  pengecualian?: (ip: string) => boolean;
}

interface CatatanKlien {
  total: number;
  waktuReset: number;
}

export function buatMiddlewarePembatasLaju(opsi: OpsiPembatasLaju = {}): MiddlewareWeb {
  const jendelaMs = opsi.jendelaMilidetik ?? 60000;
  const batasMaks = opsi.maksimalPermintaan ?? 100;
  const pesanGalat =
    opsi.pesanGalat || 'Batas frekuensi permintaan terlampaui. Silakan coba kembali sesaat lagi.';

  const penyimpanan = new Map<string, CatatanKlien>();

  // Pembersihan berkala memori catatan kadaluarsa
  const intervalBersih = setInterval(() => {
    const sekarang = Date.now();
    for (const [ip, catatan] of penyimpanan.entries()) {
      if (sekarang > catatan.waktuReset) {
        penyimpanan.delete(ip);
      }
    }
  }, jendelaMs);

  if (intervalBersih.unref) {
    intervalBersih.unref();
  }

  return async (req, res, lanjut) => {
    const ip = req.ipKlien || '127.0.0.1';

    if (opsi.pengecualian && opsi.pengecualian(ip)) {
      await lanjut();
      return;
    }

    const sekarang = Date.now();
    let catatan = penyimpanan.get(ip);

    if (!catatan || sekarang > catatan.waktuReset) {
      catatan = {
        total: 1,
        waktuReset: sekarang + jendelaMs,
      };
      penyimpanan.set(ip, catatan);
    } else {
      catatan.total++;
    }

    const sisa = Math.max(0, batasMaks - catatan.total);
    const detikReset = Math.ceil((catatan.waktuReset - sekarang) / 1000);

    res.tajuk('X-RateLimit-Limit', String(batasMaks));
    res.tajuk('X-RateLimit-Remaining', String(sisa));
    res.tajuk('X-RateLimit-Reset', String(detikReset));

    if (catatan.total > batasMaks) {
      res.tajuk('Retry-After', String(detikReset));
      res.status(429).json(
        {
          sukses: false,
          galat: 'BATAS_LAJU_TERLAMPAUI',
          pesan: pesanGalat,
          cobaKembaliDetik: detikReset,
        },
        429
      );
      return;
    }

    await lanjut();
  };
}
