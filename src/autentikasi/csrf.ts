/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Proteksi Cross-Site Request Forgery (CSRF) dengan Token Terikat Sesi
 * dan Perbandingan Waktu Konstan.
 */

import { PermintaanWeb, ResponsWeb, MiddlewareWeb, FungsiLanjut } from '../web/jenis';
import { GalatAutentikasi, JenisGalatAutentikasi } from './jenis';
import { acakHex, waktuKonstanSama } from './kriptoAman';

export interface OpsiCSRF {
  namaKuki?: string; // default 'nusantara_csrf'
  namaTajuk?: string; // default 'x-csrf-token'
  namaFieldFormulir?: string; // default '_csrf'
  metodeAman?: string[]; // default ['GET', 'HEAD', 'OPTIONS']
  kukiSameSite?: 'Strict' | 'Lax' | 'None';
  kukiSecure?: boolean;
}

export class ProteksiCSRF {
  private opsi: Required<OpsiCSRF>;

  constructor(opsi: OpsiCSRF = {}) {
    this.opsi = {
      namaKuki: opsi.namaKuki || 'nusantara_csrf',
      namaTajuk: (opsi.namaTajuk || 'x-csrf-token').toLowerCase(),
      namaFieldFormulir: opsi.namaFieldFormulir || '_csrf',
      metodeAman: opsi.metodeAman || ['GET', 'HEAD', 'OPTIONS'],
      kukiSameSite: opsi.kukiSameSite || 'Lax',
      kukiSecure: opsi.kukiSecure ?? false,
    };
  }

  /**
   * Menghasilkan token CSRF acak kriptografis (24 bytes hex).
   */
  public buatToken(): string {
    return acakHex(24);
  }

  /**
   * Memvalidasi token kandidat terhadap token sah dengan perbandingan waktu konstan.
   */
  public verifikasiToken(tokenSah: string, tokenKandidat: string): boolean {
    if (!tokenSah || !tokenKandidat || typeof tokenKandidat !== 'string') {
      return false;
    }
    return waktuKonstanSama(tokenSah, tokenKandidat);
  }

  /**
   * Middleware CSRF untuk integrasi langsung ke framework web NUSANTARA.
   */
  public middleware(): MiddlewareWeb {
    return async (req: PermintaanWeb, res: ResponsWeb, lanjut: FungsiLanjut) => {
      let tokenCSRF = req.ambilKuki(this.opsi.namaKuki);

      // Jika belum ada token di cookie, terbitkan token baru
      if (!tokenCSRF) {
        tokenCSRF = this.buatToken();
        res.kuki(this.opsi.namaKuki, tokenCSRF, {
          httpOnly: false, // Perlu dibaca script frontend jika SPA
          secure: this.opsi.kukiSecure,
          sameSite: this.opsi.kukiSameSite,
          path: '/',
        });
      }

      // Sematkan token ke objek permintaan untuk template rendering
      (req as any).csrfToken = tokenCSRF;

      // Metode aman (GET, HEAD, OPTIONS) tidak memerlukan validasi CSRF
      if (this.opsi.metodeAman.includes(req.metode.toUpperCase())) {
        await lanjut();
        return;
      }

      // Ambil token yang dikirimkan oleh klien
      const tokenDariHeader = req.ambilTajuk(this.opsi.namaTajuk);
      let tokenDariBadan: string | undefined;

      if (req.badan && typeof req.badan === 'object') {
        tokenDariBadan = req.badan[this.opsi.namaFieldFormulir];
      }

      const tokenKandidat = tokenDariHeader || tokenDariBadan;

      if (!tokenKandidat || !this.verifikasiToken(tokenCSRF, tokenKandidat)) {
        throw new GalatAutentikasi(
          JenisGalatAutentikasi.CSRF_TIDAK_VALID,
          'Validasi token CSRF gagal. Permintaan ditolak demi keamanan.',
          403
        );
      }

      await lanjut();
    };
  }
}
