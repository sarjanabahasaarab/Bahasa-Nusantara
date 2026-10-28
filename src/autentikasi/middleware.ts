/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Middleware Autentikasi, Otorisasi Peran, dan Izin untuk Framework Web NUSANTARA.
 */

import { MiddlewareWeb, PermintaanWeb, ResponsWeb, FungsiLanjut } from '../web/jenis';
import { LayananAutentikasi } from './layanan';
import { GalatAutentikasi, JenisGalatAutentikasi } from './jenis';

export interface OpsiMiddlewareAutentikasi {
  pengalihanLogin?: string; // misal '/masuk' atau '/login' untuk request browser
  zonaWajib?: boolean;      // jika true, menolak request tanpa login
}

/**
 * Middleware untuk mengekstrak dan memverifikasi sesi pengguna pada setiap request.
 */
export function buatMiddlewareSesi(layanan: LayananAutentikasi): MiddlewareWeb {
  return async (req: PermintaanWeb, res: ResponsWeb, lanjut: FungsiLanjut) => {
    layanan.validasiPermintaan(req);
    await lanjut();
  };
}

/**
 * Middleware yang mewajibkan pengguna terautentikasi (LoggedIn).
 * Mengembalikan 401 Unauthorized untuk API, atau redirect ke halaman login untuk browser.
 */
export function buatMiddlewareWajibAutentikasi(
  layanan: LayananAutentikasi,
  opsi: OpsiMiddlewareAutentikasi = {}
): MiddlewareWeb {
  return async (req: PermintaanWeb, res: ResponsWeb, lanjut: FungsiLanjut) => {
    const authData = (req as any).pengguna ? { pengguna: (req as any).pengguna } : layanan.validasiPermintaan(req);

    if (!authData || !authData.pengguna) {
      const apakahPermintaanAPI =
        req.jalur.startsWith('/api') ||
        (req.ambilTajuk('accept') && req.ambilTajuk('accept')!.includes('application/json'));

      if (!apakahPermintaanAPI && opsi.pengalihanLogin) {
        res.alihkan(opsi.pengalihanLogin, 302);
        return;
      }

      throw new GalatAutentikasi(
        JenisGalatAutentikasi.TIDAK_TERAUTENTIKASI,
        'Akses ditolak: silakan login terlebih dahulu untuk mengakses sumber daya ini.',
        401
      );
    }

    await lanjut();
  };
}

/**
 * Middleware Otorisasi: Mewajibkan peran tertentu (misal: 'admin', 'editor').
 */
export function buatMiddlewareWajibPeran(
  layanan: LayananAutentikasi,
  peranDibutuhkan: string
): MiddlewareWeb {
  return async (req: PermintaanWeb, res: ResponsWeb, lanjut: FungsiLanjut) => {
    const authData = (req as any).pengguna ? { pengguna: (req as any).pengguna } : layanan.validasiPermintaan(req);

    if (!authData || !authData.pengguna) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.TIDAK_TERAUTENTIKASI,
        'Akses ditolak: autentikasi diperlukan.',
        401
      );
    }

    const cocok = layanan.rbac.apakahCocokPeran(authData.pengguna.role, peranDibutuhkan);
    if (!cocok) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.AKSES_DITOLAK,
        `Akses ditolak: peran '${authData.pengguna.role}' tidak memiliki wewenang untuk aksi ini (dibutuhkan peran: '${peranDibutuhkan}').`,
        403
      );
    }

    await lanjut();
  };
}

/**
 * Middleware Otorisasi: Mewajibkan izin spesifik (misal: 'artikel.hapus', 'pengguna.edit').
 */
export function buatMiddlewareWajibIzin(
  layanan: LayananAutentikasi,
  izinDibutuhkan: string
): MiddlewareWeb {
  return async (req: PermintaanWeb, res: ResponsWeb, lanjut: FungsiLanjut) => {
    const authData = (req as any).pengguna ? { pengguna: (req as any).pengguna } : layanan.validasiPermintaan(req);

    if (!authData || !authData.pengguna) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.TIDAK_TERAUTENTIKASI,
        'Akses ditolak: autentikasi diperlukan.',
        401
      );
    }

    const diizinkan = layanan.rbac.apakahMemilikiIzin(authData.pengguna.role, izinDibutuhkan);
    if (!diizinkan) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.AKSES_DITOLAK,
        `Akses ditolak: izin '${izinDibutuhkan}' tidak dimiliki oleh peran pengguna.`,
        403
      );
    }

    await lanjut();
  };
}
