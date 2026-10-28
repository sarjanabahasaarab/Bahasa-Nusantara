/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Middleware CORS Terkonfigurasi Aman.
 */

import { MiddlewareWeb } from '../jenis';

export interface OpsiCORS {
  asal?: string | string[] | ((asalReq: string) => boolean);
  metode?: string[];
  tajukDiizinkan?: string[];
  tajukDiekspos?: string[];
  kredensial?: boolean;
  umurMaksimalDetik?: number;
}

export function buatMiddlewareCORS(opsi: OpsiCORS = {}): MiddlewareWeb {
  const metodeDefault = opsi.metode || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const tajukDefault = opsi.tajukDiizinkan || ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Permintaan-ID'];
  const kredensial = opsi.kredensial ?? false;
  const maxAge = opsi.umurMaksimalDetik ?? 86400;

  return async (req, res, lanjut) => {
    const originKlien = req.tajuk['origin'] || req.tajuk['Origin'];

    if (originKlien) {
      let asalDiizinkan = false;
      let headerAsal = '';

      if (!opsi.asal || opsi.asal === '*') {
        // PERINGATAN KEAMANAN: Jangan gunakan wildcard '*' bila kredensial diaktifkan
        if (kredensial) {
          headerAsal = originKlien;
          asalDiizinkan = true;
        } else {
          headerAsal = '*';
          asalDiizinkan = true;
        }
      } else if (typeof opsi.asal === 'string') {
        if (opsi.asal === originKlien) {
          headerAsal = originKlien;
          asalDiizinkan = true;
        }
      } else if (Array.isArray(opsi.asal)) {
        if (opsi.asal.includes(originKlien)) {
          headerAsal = originKlien;
          asalDiizinkan = true;
        }
      } else if (typeof opsi.asal === 'function') {
        if (opsi.asal(originKlien)) {
          headerAsal = originKlien;
          asalDiizinkan = true;
        }
      }

      if (asalDiizinkan) {
        res.tajuk('Access-Control-Allow-Origin', headerAsal);
        if (kredensial) {
          res.tajuk('Access-Control-Allow-Credentials', 'true');
        }
        if (opsi.tajukDiekspos && opsi.tajukDiekspos.length > 0) {
          res.tajuk('Access-Control-Expose-Headers', opsi.tajukDiekspos.join(', '));
        }
      }
    }

    // Tangani preflight OPTIONS request
    if (req.metode === 'OPTIONS') {
      res.tajuk('Access-Control-Allow-Methods', metodeDefault.join(', '));
      res.tajuk('Access-Control-Allow-Headers', tajukDefault.join(', '));
      res.tajuk('Access-Control-Max-Age', String(maxAge));
      res.status(204).kirimStatus(204);
      return;
    }

    await lanjut();
  };
}
