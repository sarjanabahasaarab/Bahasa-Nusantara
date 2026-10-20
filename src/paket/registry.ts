/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import { bacaManifest } from './manifest';
import { periksaKeamananJalurLokal } from './keamanan';

export interface InfoVersiPaket {
  versi: string;
  dependensi: Record<string, string>;
  integritas?: string;
  jalurLokal?: string;
}

export interface InfoPaketRegistry {
  nama: string;
  versiTerbaru: string;
  daftarVersi: Record<string, InfoVersiPaket>;
  deskripsi?: string;
  lisensi?: string;
}

/**
 * Antarmuka Abstraksi Registri Paket NUSANTARA.
 */
export interface PackageRegistry {
  dapatkanInfo(nama: string): InfoPaketRegistry | null;
  ambilBerkasPaket(nama: string, versi: string): Record<string, string>;
}

/**
 * Implementasi Registri Lokal untuk Phase 16.
 * Mencari paket pada direktori proyek lokal atau direktori paket khusus.
 */
export class LocalRegistry implements PackageRegistry {
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriPencarian: string[];

  constructor(pembaca: PembacaBerkas, direktoriPencarian: string[] = ['/proyek/paket', 'paket']) {
    this.pembaca = pembaca;
    this.direktoriPencarian = direktoriPencarian.map(d => this.pembaca.jalurAbsolut(d));
  }

  public dapatkanInfo(nama: string): InfoPaketRegistry | null {
    for (const dirBasis of this.direktoriPencarian) {
      const jalurPaket = this.pembaca.gabungJalur(dirBasis, nama);
      const jalurManifest = this.pembaca.gabungJalur(jalurPaket, 'nusantara.toml');

      if (this.pembaca.apakahAda(jalurManifest)) {
        try {
          const konten = this.pembaca.baca(jalurManifest);
          const manifest = bacaManifest(konten);

          const dependensiString: Record<string, string> = {};
          for (const [depNama, depVal] of Object.entries(manifest.dependensi)) {
            dependensiString[depNama] = typeof depVal === 'string' ? depVal : depVal.versi || '*';
          }

          return {
            nama: manifest.nusantara.nama,
            versiTerbaru: manifest.nusantara.versi,
            deskripsi: manifest.nusantara.deskripsi,
            lisensi: manifest.nusantara.lisensi,
            daftarVersi: {
              [manifest.nusantara.versi]: {
                versi: manifest.nusantara.versi,
                dependensi: dependensiString,
                jalurLokal: jalurPaket,
              },
            },
          };
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  public ambilBerkasPaket(nama: string, _versi: string): Record<string, string> {
    const info = this.dapatkanInfo(nama);
    if (!info || !info.daftarVersi[_versi]?.jalurLokal) {
      throw new Error(`Paket '${nama}' versi '${_versi}' tidak ditemukan di registri lokal.`);
    }

    const jalurPaket = info.daftarVersi[_versi].jalurLokal!;
    const hasil: Record<string, string> = {};

    // Salin manifest
    const manifestPath = this.pembaca.gabungJalur(jalurPaket, 'nusantara.toml');
    if (this.pembaca.apakahAda(manifestPath)) {
      hasil['nusantara.toml'] = this.pembaca.baca(manifestPath);
    }

    // Periksa berkas sumber di src/<nama>.nusantara atau <nama>.nusantara
    const kandidat = [
      this.pembaca.gabungJalur(jalurPaket, 'src', `${nama}.nusantara`),
      this.pembaca.gabungJalur(jalurPaket, `${nama}.nusantara`),
      this.pembaca.gabungJalur(jalurPaket, 'src', 'utama.nusantara'),
      this.pembaca.gabungJalur(jalurPaket, 'modul.nusantara'),
    ];

    for (const k of kandidat) {
      if (this.pembaca.apakahAda(k)) {
        const relatif = k.slice(jalurPaket.length + 1).replace(/\\/g, '/');
        hasil[relatif] = this.pembaca.baca(k);
      }
    }

    return hasil;
  }
}

/**
 * Abstraksi Registri Jarak Jauh (Remote Registry) yang disiapkan untuk Phase 28.
 */
export class RemoteRegistry implements PackageRegistry {
  private readonly urlBasis: string;

  constructor(urlBasis: string = 'https://paket.nusantara.lang/api/v1') {
    this.urlBasis = urlBasis;
  }

  public dapatkanInfo(_nama: string): InfoPaketRegistry | null {
    throw new Error(
      `Registri daring (${this.urlBasis}) belum aktif pada Phase 16. Silakan gunakan dependensi paket lokal atau registri lokal.`
    );
  }

  public ambilBerkasPaket(_nama: string, _versi: string): Record<string, string> {
    throw new Error(
      `Pengunduhan paket dari registri daring belum diaktifkan pada Phase 16.`
    );
  }
}
