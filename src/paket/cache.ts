/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistem Cache Paket Terdistribusi & Verifikasi Integritas (Phase 27)
 * Mengelola penyimpanan paket lokal (~/.nusantara/cache) untuk instalasi offline yang cepat dan reproduktif.
 */

import { PembacaBerkas } from '../modul/pembacaBerkas';
import { hitungChecksum } from './lockfile';

export interface EntriCachePaket {
  nama: string;
  versi: string;
  jalurCache: string;
  checksumSha256: string;
  ukuranByte: number;
  waktuDisimpan: string;
  jumlahBerkas: number;
}

export interface HasilPemeriksaanCache {
  ditemukan: boolean;
  entri?: EntriCachePaket;
  berkas?: Record<string, string>;
  integritasValid: boolean;
  pesan?: string;
}

export class GalatIntegritasCache extends Error {
  constructor(nama: string, versi: string, diharapkan: string, aktual: string) {
    super(
      `Pelanggaran integritas paket '${nama}@${versi}':\n` +
      `  Checksum diharapkan : ${diharapkan}\n` +
      `  Checksum aktual     : ${aktual}\n` +
      `Arsip cache kemungkinan rusak atau telah dimanipulasi.`
    );
    this.name = 'GalatIntegritasCache';
  }
}

export class ManajerCachePaket {
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriCache: string;
  private indeksCache: Map<string, EntriCachePaket> = new Map();

  constructor(pembaca: PembacaBerkas, direktoriCache?: string) {
    this.pembaca = pembaca;
    const homeDir = typeof process !== 'undefined' && process.env?.HOME
      ? process.env.HOME
      : '/proyek';
    this.direktoriCache = this.pembaca.normalisasiJalur(
      direktoriCache || this.pembaca.gabungJalur(homeDir, '.nusantara', 'cache')
    );
    this.muatIndeks();
  }

  public dapatkanDirektoriCache(): string {
    return this.direktoriCache;
  }

  private kunci(nama: string, versi: string): string {
    return `${nama}@${versi}`;
  }

  private dapatkanJalurIndeks(): string {
    return this.pembaca.gabungJalur(this.direktoriCache, 'indeks-cache.json');
  }

  private muatIndeks(): void {
    const jalur = this.dapatkanJalurIndeks();
    if (this.pembaca.apakahAda(jalur)) {
      try {
        const raw = this.pembaca.baca(jalur);
        const data: EntriCachePaket[] = JSON.parse(raw);
        for (const e of data) {
          this.indeksCache.set(this.kunci(e.nama, e.versi), e);
        }
      } catch {
        this.indeksCache.clear();
      }
    }
  }

  private tulisBerkasAman(jalur: string, konten: string): void {
    if (typeof (this.pembaca as any).tulisBerkas === 'function') {
      (this.pembaca as any).tulisBerkas(jalur, konten);
      return;
    }
    if (typeof this.pembaca.tulis === 'function') {
      this.pembaca.tulis(jalur, konten);
      return;
    }
    try {
      const fs = typeof require !== 'undefined' ? require('fs') : null;
      const path = typeof require !== 'undefined' ? require('path') : null;
      if (fs && path) {
        const d = path.dirname(jalur);
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(jalur, konten, 'utf-8');
      }
    } catch {
      // Abaikan
    }
  }

  private simpanIndeks(): void {
    const jalur = this.dapatkanJalurIndeks();
    const data = Array.from(this.indeksCache.values());
    try {
      this.tulisBerkasAman(jalur, JSON.stringify(data, null, 2));
    } catch {
      // Abaikan jika sandbox read-only
    }
  }

  /**
   * Menyimpan isi paket ke dalam cache lokal.
   */
  public simpan(
    nama: string,
    versi: string,
    berkas: Record<string, string>,
    checksumDiharapkan?: string
  ): EntriCachePaket {
    const k = this.kunci(nama, versi);
    const folderPaket = this.pembaca.gabungJalur(this.direktoriCache, nama, versi);

    // Hitung ringkasan isi untuk hashing
    const sortedKeys = Object.keys(berkas).sort();
    let payload = '';
    let ukuranTotal = 0;

    for (const fileKey of sortedKeys) {
      const isi = berkas[fileKey];
      payload += `${fileKey}:${isi.length}:${isi}|`;
      ukuranTotal += new TextEncoder().encode(isi).length;

      const jalurSimpan = this.pembaca.gabungJalur(folderPaket, fileKey);
      this.tulisBerkasAman(jalurSimpan, isi);
    }

    const calculatedChecksum = hitungChecksum(payload || `${nama}@${versi}`);

    if (checksumDiharapkan && checksumDiharapkan !== calculatedChecksum) {
      throw new GalatIntegritasCache(nama, versi, checksumDiharapkan, calculatedChecksum);
    }

    const entri: EntriCachePaket = {
      nama,
      versi,
      jalurCache: folderPaket,
      checksumSha256: calculatedChecksum,
      ukuranByte: ukuranTotal,
      waktuDisimpan: new Date().toISOString(),
      jumlahBerkas: sortedKeys.length,
    };

    this.indeksCache.set(k, entri);
    this.simpanIndeks();
    return entri;
  }

  /**
   * Mengambil paket dari cache dan memverifikasi integritas checksum.
   */
  public ambil(nama: string, versi: string, checksumDiharapkan?: string): HasilPemeriksaanCache {
    const k = this.kunci(nama, versi);
    const entri = this.indeksCache.get(k);

    if (!entri) {
      return { ditemukan: false, integritasValid: false };
    }

    const folderPaket = entri.jalurCache;
    if (!this.pembaca.apakahAda(folderPaket)) {
      this.indeksCache.delete(k);
      this.simpanIndeks();
      return { ditemukan: false, integritasValid: false };
    }

    // Baca berkas yang tersimpan di cache
    const berkas: Record<string, string> = {};
    const daftarBerkasCache = this.bacaDirektoriRekursif(folderPaket);

    for (const j of daftarBerkasCache) {
      const rel = j.substring(folderPaket.length + 1).replace(/\\/g, '/');
      berkas[rel] = this.pembaca.baca(j);
    }

    // Verifikasi checksum
    const sortedKeys = Object.keys(berkas).sort();
    let payload = '';
    for (const fk of sortedKeys) {
      const isi = berkas[fk];
      payload += `${fk}:${isi.length}:${isi}|`;
    }
    const computed = hitungChecksum(payload || `${nama}@${versi}`);

    const targetCheck = checksumDiharapkan || entri.checksumSha256;
    if (targetCheck && targetCheck !== computed) {
      return {
        ditemukan: true,
        entri,
        berkas,
        integritasValid: false,
        pesan: `Checksum cache tidak sesuai (harapan: ${targetCheck}, ditemukan: ${computed}).`,
      };
    }

    return {
      ditemukan: true,
      entri,
      berkas,
      integritasValid: true,
    };
  }

  /**
   * Memeriksa apakah suatu paket sudah tersedia di cache dengan checksum yang cocok.
   */
  public apakahAda(nama: string, versi: string, checksumDiharapkan?: string): boolean {
    const hasil = this.ambil(nama, versi, checksumDiharapkan);
    return hasil.ditemukan && hasil.integritasValid;
  }

  /**
   * Menghapus paket tertentu dari cache.
   */
  public hapus(nama: string, versi?: string): boolean {
    if (versi) {
      const k = this.kunci(nama, versi);
      const entri = this.indeksCache.get(k);
      if (entri) {
        this.hapusDirektoriRekursif(entri.jalurCache);
        this.indeksCache.delete(k);
        this.simpanIndeks();
        return true;
      }
      return false;
    }

    let ada = false;
    for (const [k, e] of Array.from(this.indeksCache.entries())) {
      if (e.nama === nama) {
        this.hapusDirektoriRekursif(e.jalurCache);
        this.indeksCache.delete(k);
        ada = true;
      }
    }
    if (ada) this.simpanIndeks();
    return ada;
  }

  /**
   * Mengosongkan seluruh isi cache paket.
   */
  public bersihkanSemua(): { jumlahDihapus: number; ukuranByte: number } {
    let jumlah = this.indeksCache.size;
    let totalUkuran = 0;
    for (const e of this.indeksCache.values()) {
      totalUkuran += e.ukuranByte;
    }

    this.hapusDirektoriRekursif(this.direktoriCache);
    this.indeksCache.clear();
    return { jumlahDihapus: jumlah, ukuranByte: totalUkuran };
  }

  public dapatkanSemuaEntri(): EntriCachePaket[] {
    return Array.from(this.indeksCache.values());
  }

  public hitungTotalUkuranCache(): number {
    let total = 0;
    for (const e of this.indeksCache.values()) {
      total += e.ukuranByte;
    }
    return total;
  }

  private bacaDirektoriRekursif(dir: string): string[] {
    const hasil: string[] = [];
    const normDir = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(dir));

    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      const semua = (this.pembaca as any).dapatkanSemuaBerkas() as Map<string, string>;
      for (const jalur of semua.keys()) {
        const normJalur = this.pembaca.normalisasiJalur(jalur);
        if (normJalur.startsWith(normDir === '/' ? '/' : normDir + '/')) {
          hasil.push(normJalur);
        }
      }
      return hasil;
    }

    if (!this.pembaca.apakahAda(dir)) return hasil;

    const antrean = [dir];
    while (antrean.length > 0) {
      const curr = antrean.shift()!;
      const isDir = typeof this.pembaca.apakahDirektori === 'function' ? this.pembaca.apakahDirektori(curr) : false;
      if (isDir) {
        const anak = typeof this.pembaca.daftarDirektori === 'function'
          ? this.pembaca.daftarDirektori(curr)
          : typeof (this.pembaca as any).bacaDirektori === 'function'
          ? (this.pembaca as any).bacaDirektori(curr)
          : [];
        for (const a of anak) {
          antrean.push(this.pembaca.gabungJalur(curr, a));
        }
      } else {
        hasil.push(curr);
      }
    }
    return hasil;
  }

  private hapusDirektoriRekursif(dir: string): void {
    const normDir = this.pembaca.normalisasiJalur(this.pembaca.jalurAbsolut(dir));
    if (typeof (this.pembaca as any).dapatkanSemuaBerkas === 'function') {
      const semua = (this.pembaca as any).dapatkanSemuaBerkas() as Map<string, string>;
      for (const jalur of Array.from(semua.keys())) {
        const normJalur = this.pembaca.normalisasiJalur(jalur);
        if (normJalur === normDir || normJalur.startsWith(normDir === '/' ? '/' : normDir + '/')) {
          if (typeof (this.pembaca as any).hapusBerkas === 'function') {
            (this.pembaca as any).hapusBerkas(jalur);
          }
        }
      }
      return;
    }

    try {
      const fs = typeof require !== 'undefined' ? require('fs') : null;
      if (fs && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // Abaikan jika sandbox
    }
  }
}
