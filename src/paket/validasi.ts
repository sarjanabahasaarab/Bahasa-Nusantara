/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import { ManifestPaket, bacaManifest } from './manifest';
import { apakahVersiValid } from './semver';
import { validasiNamaPaket } from './keamanan';
import { Parser } from '../parser/parser';
import { PenemuUji } from '../testing/penemuUji';
import { PelariUji } from '../testing/pelariUji';
import { StatusUji } from '../testing/types';

export interface HasilItemValidasi {
  nama: string;
  kategori: 'manifest' | 'sintaks' | 'pengujian' | 'dependensi' | 'keamanan';
  status: 'LULUS' | 'GAGAL' | 'PERINGATAN';
  pesan: string;
}

export interface LaporanValidasiPaket {
  valid: boolean;
  nama: string;
  versi: string;
  direktori: string;
  daftarPemeriksaan: HasilItemValidasi[];
  daftarGalat: string[];
  daftarPeringatan: string[];
  manifest?: ManifestPaket;
  totalBerkasSumber: number;
  totalUji: number;
}

/**
 * Mesin Validasi Kelayakan Paket (Package Validator) NUSANTARA (Phase 22).
 * Memverifikasi integritas manifest, tata bahasa sumber, dependensi, dan pengujian.
 */
export class ValidatorPaket {
  private readonly pembaca: PembacaBerkas;

  constructor(pembaca: PembacaBerkas) {
    this.pembaca = pembaca;
  }

  /**
   * Menjalankan validasi menyeluruh pada sebuah direktori proyek paket NUSANTARA.
   */
  public validasi(direktoriProyek: string): LaporanValidasiPaket {
    const dirAbsolut = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(direktoriProyek));
    const daftarPemeriksaan: HasilItemValidasi[] = [];
    const daftarGalat: string[] = [];
    const daftarPeringatan: string[] = [];

    let manifestTerbaca: ManifestPaket | undefined;
    let namaPaket = 'tanpa-nama';
    let versiPaket = '0.0.0';

    // 1. Validasi Berkas Manifest (nusantara.toml)
    const jalurManifest = this.pembaca.gabungJalur(dirAbsolut, 'nusantara.toml');
    if (!this.pembaca.apakahAda(jalurManifest)) {
      daftarGalat.push(`Berkas manifest 'nusantara.toml' tidak ditemukan di ${dirAbsolut}.`);
      daftarPemeriksaan.push({
        nama: 'Keberadaan Manifest (nusantara.toml)',
        kategori: 'manifest',
        status: 'GAGAL',
        pesan: 'Berkas nusantara.toml tidak ditemukan.',
      });
    } else {
      try {
        const konten = this.pembaca.baca(jalurManifest);
        manifestTerbaca = bacaManifest(konten);
        namaPaket = manifestTerbaca.nusantara.nama;
        versiPaket = manifestTerbaca.nusantara.versi;

        daftarPemeriksaan.push({
          nama: 'Struktur & Sintaks Manifest (nusantara.toml)',
          kategori: 'manifest',
          status: 'LULUS',
          pesan: `Manifest valid untuk paket '${namaPaket}' v${versiPaket}.`,
        });
      } catch (err: any) {
        daftarGalat.push(`Manifest tidak valid: ${err.message}`);
        daftarPemeriksaan.push({
          nama: 'Struktur & Sintaks Manifest (nusantara.toml)',
          kategori: 'manifest',
          status: 'GAGAL',
          pesan: err.message,
        });
      }
    }

    // 2. Validasi Identitas Paket & Semantic Versioning
    if (manifestTerbaca) {
      try {
        validasiNamaPaket(manifestTerbaca.nusantara.nama);
        if (!apakahVersiValid(manifestTerbaca.nusantara.versi)) {
          throw new Error(`Versi '${manifestTerbaca.nusantara.versi}' bukan SemVer valid.`);
        }
        daftarPemeriksaan.push({
          nama: 'Validasi Nama & Versi Semantik (SemVer)',
          kategori: 'manifest',
          status: 'LULUS',
          pesan: `Identitas paket '${namaPaket}@${versiPaket}' memenuhi standar konvensi.`,
        });
      } catch (err: any) {
        daftarGalat.push(err.message);
        daftarPemeriksaan.push({
          nama: 'Validasi Nama & Versi Semantik (SemVer)',
          kategori: 'manifest',
          status: 'GAGAL',
          pesan: err.message,
        });
      }

      // Validasi metadata URL jika ada
      if (manifestTerbaca.nusantara.repository) {
        const url = manifestTerbaca.nusantara.repository;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('git@')) {
          daftarPeringatan.push(`URL repository '${url}' sebaiknya menggunakan protokol https:// atau git@.`);
        }
      }
    }

    // 3. Validasi Sintaksis & Grammar Berkas Sumber (.nusantara)
    let totalBerkasSumber = 0;
    const berkasSumber = this.kumpulkanBerkasSumber(dirAbsolut);
    totalBerkasSumber = berkasSumber.length;

    let adaGalatSintaks = false;
    for (const jalur of berkasSumber) {
      try {
        const kode = this.pembaca.baca(jalur);
        const parser = new Parser(kode);
        parser.parse();
        const galatParser = parser.dapatkanDaftarGalat();
        if (galatParser.length > 0) {
          throw new Error(galatParser[0].message);
        }
      } catch (err: any) {
        adaGalatSintaks = true;
        const namaRelatif = jalur.replace(dirAbsolut, '').replace(/^[/\\]+/, '');
        daftarGalat.push(`Kesalahan sintaksis pada '${namaRelatif}': ${err.message}`);
      }
    }

    if (totalBerkasSumber === 0) {
      daftarPeringatan.push(`Tidak ditemukan berkas sumber .nusantara di dalam direktori proyek.`);
      daftarPemeriksaan.push({
        nama: 'Kompilasi Sintaksis Kode Sumber (.nusantara)',
        kategori: 'sintaks',
        status: 'PERINGATAN',
        pesan: 'Tidak ada berkas sumber .nusantara yang terdeteksi.',
      });
    } else if (adaGalatSintaks) {
      daftarPemeriksaan.push({
        nama: 'Kompilasi Sintaksis Kode Sumber (.nusantara)',
        kategori: 'sintaks',
        status: 'GAGAL',
        pesan: `Terdapat berkas sumber yang mengandung kesalahan tata bahasa (grammar/sintaksis).`,
      });
    } else {
      daftarPemeriksaan.push({
        nama: 'Kompilasi Sintaksis Kode Sumber (.nusantara)',
        kategori: 'sintaks',
        status: 'LULUS',
        pesan: `Seluruh ${totalBerkasSumber} berkas sumber berhasil diurai tanpa galat parser.`,
      });
    }

    // 4. Validasi Pengujian Paket (Package Tests)
    let totalUji = 0;
    try {
      const penemu = new PenemuUji(this.pembaca);
      const berkasUji = penemu.temukanBerkasUji(dirAbsolut);
      totalUji = berkasUji.length;

      if (berkasUji.length > 0) {
        const runner = new PelariUji(this.pembaca);
        const ringkasanUji = runner.jalankanSinkron(berkasUji);

        if (ringkasanUji.gagal > 0 || ringkasanUji.status === StatusUji.GAGAL) {
          daftarGalat.push(`Pengujian paket gagal: ${ringkasanUji.gagal} dari ${ringkasanUji.totalUji} uji gagal.`);
          daftarPemeriksaan.push({
            nama: 'Verifikasi Pengujian Paket (Package Tests)',
            kategori: 'pengujian',
            status: 'GAGAL',
            pesan: `${ringkasanUji.gagal} pengujian gagal. Paket tidak layak dirilis.`,
          });
        } else {
          daftarPemeriksaan.push({
            nama: 'Verifikasi Pengujian Paket (Package Tests)',
            kategori: 'pengujian',
            status: 'LULUS',
            pesan: `Seluruh ${ringkasanUji.lulus} pengujian paket berhasil lulus 100%.`,
          });
        }
      } else {
        daftarPemeriksaan.push({
          nama: 'Verifikasi Pengujian Paket (Package Tests)',
          kategori: 'pengujian',
          status: 'LULUS',
          pesan: 'Tidak ada berkas pengujian khusus yang didefinisikan.',
        });
      }
    } catch (err: any) {
      daftarGalat.push(`Eksekusi pengujian paket gagal: ${err.message}`);
      daftarPemeriksaan.push({
        nama: 'Verifikasi Pengujian Paket (Package Tests)',
        kategori: 'pengujian',
        status: 'GAGAL',
        pesan: err.message,
      });
    }

    // 5. Validasi Higienitas Keamanan & Dokumen
    const readmeJalur = this.pembaca.gabungJalur(dirAbsolut, 'README.md');
    if (!this.pembaca.apakahAda(readmeJalur)) {
      daftarPeringatan.push(`Disarankan menyertakan 'README.md' untuk dokumentasi pengguna.`);
    }

    let adaBerkasSensitif = false;
    const berkasSensitif = ['.env', '.env.local', 'id_rsa', 'id_ed25519'];
    for (const bs of berkasSensitif) {
      if (this.pembaca.apakahAda(this.pembaca.gabungJalur(dirAbsolut, bs))) {
        daftarGalat.push(`Ditemukan berkas sensitif '${bs}' yang dilarang berada dalam paket rilis.`);
        adaBerkasSensitif = true;
      }
    }

    for (const b of berkasSumber) {
      const isi = this.pembaca.baca(b);
      if (/(ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----|kredensial|rahasia)/i.test(isi)) {
        daftarGalat.push(`Terdeteksi potensi kebocoran kredensial rahasia / kunci privat pada '${b}'.`);
        adaBerkasSensitif = true;
      }
    }

    if (adaBerkasSensitif) {
      daftarPemeriksaan.push({
        nama: 'Higienitas Keamanan & Sanitasi Berkas Sensitif',
        kategori: 'keamanan',
        status: 'GAGAL',
        pesan: 'Ditemukan berkas sensitif atau kunci privat di dalam paket.',
      });
    } else {
      daftarPemeriksaan.push({
        nama: 'Higienitas Keamanan & Sanitasi Berkas Sensitif',
        kategori: 'keamanan',
        status: 'LULUS',
        pesan: 'Tidak ditemukan berkas sensitif atau kunci privat di berkas paket.',
      });
    }

    const valid = daftarGalat.length === 0;

    return {
      valid,
      nama: namaPaket,
      versi: versiPaket,
      direktori: dirAbsolut,
      daftarPemeriksaan,
      daftarGalat,
      daftarPeringatan,
      manifest: manifestTerbaca,
      totalBerkasSumber,
      totalUji,
    };
  }

  private kumpulkanBerkasSumber(direktori: string): string[] {
    const hasil: string[] = [];

    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      const semua = (this.pembaca as any).dapatkanSemuaBerkas() as Map<string, string>;
      for (const jalur of semua.keys()) {
        if (jalur.endsWith('.nusantara') && !jalur.includes('/tests/') && !jalur.includes('.uji.nusantara')) {
          if (jalur.startsWith(direktori)) {
            hasil.push(jalur);
          }
        }
      }
      return hasil;
    }

    // Fallback pindai direktori biasa
    const pindai = (dir: string) => {
      let entri: string[] = [];
      if (typeof (this.pembaca as any).daftarDirektori === 'function') {
        try {
          entri = (this.pembaca as any).daftarDirektori(dir) || [];
        } catch {
          entri = [];
        }
      }

      for (const item of entri) {
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === '.nusantara') {
          continue;
        }
        const lengkap = this.pembaca.gabungJalur(dir, item);
        const isDir =
          typeof (this.pembaca as any).apakahDirektori === 'function'
            ? (this.pembaca as any).apakahDirektori(lengkap)
            : false;

        if (isDir) {
          pindai(lengkap);
        } else if (item.endsWith('.nusantara') && !item.includes('.uji.') && !item.includes('_test.')) {
          hasil.push(lengkap);
        }
      }
    };

    pindai(direktori);
    return hasil;
  }
}
