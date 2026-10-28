/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Web Application Framework (Phase 30)
 * Middleware Keamanan Header Standar (Security Headers) & ID Permintaan.
 */

import { MiddlewareWeb } from '../jenis';

export interface OpsiKeamanan {
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  contentTypeOptions?: boolean;
  xssFilter?: boolean;
  referrerPolicy?: string;
}

export function buatMiddlewareKeamanan(opsi: OpsiKeamanan = {}): MiddlewareWeb {
  const frameOptions = opsi.frameOptions ?? 'SAMEORIGIN';
  const contentTypeOptions = opsi.contentTypeOptions ?? true;
  const xssFilter = opsi.xssFilter ?? true;
  const referrerPolicy = opsi.referrerPolicy || 'strict-origin-when-cross-origin';

  return async (req, res, lanjut) => {
    // 1. Tetapkan ID Permintaan (Request ID) untuk pelacakan aman
    res.tajuk('X-Permintaan-ID', req.id);

    // 2. Cegah MIME sniffing
    if (contentTypeOptions) {
      res.tajuk('X-Content-Type-Options', 'nosniff');
    }

    // 3. Lindungi dari serangan clickjacking
    if (frameOptions) {
      res.tajuk('X-Frame-Options', frameOptions);
    }

    // 4. Filter XSS peramban lama
    if (xssFilter) {
      res.tajuk('X-XSS-Protection', '1; mode=block');
    }

    // 5. Kebijakan referrer
    if (referrerPolicy) {
      res.tajuk('Referrer-Policy', referrerPolicy);
    }

    await lanjut();
  };
}
