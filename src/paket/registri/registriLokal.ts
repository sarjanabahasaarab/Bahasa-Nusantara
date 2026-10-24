/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PembacaBerkas, PembacaBerkasMemori, PembacaBerkasNode } from '../../modul/pembacaBerkas';
import { ArsipPaketData, uraiArsipPaket } from '../arsip';
import { validasiNamaPaket } from '../keamanan';
import { uraiVersi, bandingkanVersi } from '../semver';
import { hitungChecksum } from '../lockfile';
import {
  AntarmukaRegistri,
  MetadataPaketRegistri,
  MetadataVersiPaket,
  HasilPencarianPaket,
  HasilPenerbitanPaket,
  GalatImmutabilitasPaket,
  GalatRegistri,
} from './types';

export interface OpsiRegistriLokal {
  direktoriBasis?: string;
  pembacaBerkas?: PembacaBerkas;
}

/**
 * Registri Paket Lokal Resmi NUSANTARA (Phase 22).
 * Menyediakan penyimpanan rilis paket immutable, pencarian, dan pengunduhan lokal tanpa memerlukan internet.
 */
export class RegistriLokal implements AntarmukaRegistri {
  public readonly nama: string = 'registri-lokal';
  private readonly pembaca: PembacaBerkas;
  private readonly direktoriBasis: string;

  constructor(opsi?: OpsiRegistriLokal | PembacaBerkas) {
    if (opsi && typeof (opsi as any).apakahAda === 'function') {
      this.pembaca = opsi as PembacaBerkas;
      this.direktoriBasis = '/proyek/registri';
    } else {
      const opt = opsi as OpsiRegistriLokal | undefined;
      this.pembaca =
        opt?.pembacaBerkas ||
        (typeof window !== 'undefined' ? new PembacaBerkasMemori() : new PembacaBerkasNode());
      this.direktoriBasis = this.pembaca.normalisasiJalur(
        this.pembaca.jalurAbsolut(opt?.direktoriBasis || '/proyek/registri')
      );
    }

    this.inisialisasiStruktur();
  }

  public dapatkanDirektoriBasis(): string {
    return this.direktoriBasis;
  }

  private inisialisasiStruktur(): void {
    try {
      const dirMetadata = this.pembaca.gabungJalur(this.direktoriBasis, 'metadata');
      const dirPackages = this.pembaca.gabungJalur(this.direktoriBasis, 'packages');
      const jalurIndex = this.pembaca.gabungJalur(this.direktoriBasis, 'index.json');

      if (typeof (this.pembaca as any).buatDirektori === 'function') {
        (this.pembaca as any).buatDirektori(dirMetadata);
        (this.pembaca as any).buatDirektori(dirPackages);
      }

      if (!this.pembaca.apakahAda(jalurIndex)) {
        this.tulisBerkas(jalurIndex, JSON.stringify({ paket: [] }, null, 2));
      }
    } catch {
      // Inisialisasi struktur registri bersifat lazy saat berkas ditulis
    }
  }

  /**
   * Mengambil metadata lengkap paket dari registri.
   */
  public dapatkanMetadata(nama: string): MetadataPaketRegistri | null {
    validasiNamaPaket(nama);
    const jalurMeta = this.pembaca.gabungJalur(this.direktoriBasis, 'metadata', `${nama}.json`);

    if (!this.pembaca.apakahAda(jalurMeta)) {
      return null;
    }

    try {
      const konten = this.pembaca.baca(jalurMeta);
      return JSON.parse(konten) as MetadataPaketRegistri;
    } catch {
      return null;
    }
  }

  /**
   * Mengambil rincian versi tertentu dari sebuah paket.
   */
  public dapatkanVersi(nama: string, versi: string): MetadataVersiPaket | null {
    const meta = this.dapatkanMetadata(nama);
    if (!meta) return null;
    return meta.daftarVersi[versi] || null;
  }

  /**
   * Mencari paket di registri berdasarkan kueri teks (nama, deskripsi, kata kunci, penulis).
   */
  public cari(kueri: string): HasilPencarianPaket[] {
    const kueriBersih = kueri.trim().toLowerCase();
    const hasil: HasilPencarianPaket[] = [];
    const daftarNama = this.daftarSemuaPaket();

    for (const nama of daftarNama) {
      const meta = this.dapatkanMetadata(nama);
      if (!meta) continue;

      let skor = 0;
      const namaKecil = meta.nama.toLowerCase();
      const deskKecil = (meta.deskripsi || '').toLowerCase();
      const kataKunci = (meta.kata_kunci || []).map(k => k.toLowerCase());
      const penulis = Array.isArray(meta.penulis)
        ? meta.penulis.join(' ').toLowerCase()
        : (meta.penulis || '').toLowerCase();

      if (!kueriBersih) {
        skor = 1; // Tampilkan semua jika kueri kosong
      } else {
        if (namaKecil === kueriBersih) skor += 100;
        else if (namaKecil.startsWith(kueriBersih)) skor += 50;
        else if (namaKecil.includes(kueriBersih)) skor += 30;

        if (kataKunci.some(k => k.includes(kueriBersih))) skor += 40;
        if (deskKecil.includes(kueriBersih)) skor += 20;
        if (penulis.includes(kueriBersih)) skor += 10;
      }

      if (skor > 0) {
        hasil.push({
          nama: meta.nama,
          versi: meta.versiTerbaru,
          deskripsi: meta.deskripsi,
          lisensi: meta.lisensi,
          penulis: meta.penulis,
          kata_kunci: meta.kata_kunci,
          skorRelevansi: skor,
        });
      }
    }

    return hasil.sort((a, b) => b.skorRelevansi - a.skorRelevansi);
  }

  /**
   * Menerbitkan arsip paket ke registri lokal dengan penegakan immutabilitas ketat.
   */
  public terbitkan(arsip: ArsipPaketData): HasilPenerbitanPaket {
    const nama = arsip.header.nama;
    const versi = arsip.header.versi;

    validasiNamaPaket(nama);
    uraiVersi(versi);

    const jalurMeta = this.pembaca.gabungJalur(this.direktoriBasis, 'metadata', `${nama}.json`);
    const dirPaket = this.pembaca.gabungJalur(this.direktoriBasis, 'packages', nama);
    const namaBerkasArsip = `${nama}-${versi}.npk`;
    const jalurArsip = this.pembaca.gabungJalur(dirPaket, namaBerkasArsip);

    if (typeof (this.pembaca as any).buatDirektori === 'function') {
      (this.pembaca as any).buatDirektori(dirPaket);
    }

    let meta = this.dapatkanMetadata(nama);

    // PENEGAKAN IMMUTABILITAS: Jika versi sudah ada, tolak publikasi!
    if (meta && meta.daftarVersi[versi]) {
      throw new GalatImmutabilitasPaket(nama, versi);
    }

    // Ambil dependensi dari berkas nusantara.toml di dalam arsip
    let dependensi: Record<string, string> = {};
    if (arsip.berkas['nusantara.toml']) {
      try {
        const smol = require('smol-toml');
        const parsed = smol.parse(arsip.berkas['nusantara.toml']) as any;
        if (parsed.dependensi && typeof parsed.dependensi === 'object') {
          for (const [k, v] of Object.entries(parsed.dependensi)) {
            dependensi[k] = typeof v === 'string' ? v : (v as any).versi || '*';
          }
        }
      } catch {
        // Abaikan
      }
    }

    const infoVersiBaru: MetadataVersiPaket = {
      versi,
      checksum: arsip.checksum,
      dependensi,
      diterbitkanPada: new Date().toISOString(),
      ukuranByte: arsip.header.totalUkuranByte,
      namaBerkasArsip,
      penulis: arsip.header.penulis,
      lisensi: arsip.header.lisensi,
      deskripsi: arsip.header.deskripsi,
    };

    const sekarang = new Date().toISOString();

    if (!meta) {
      meta = {
        nama,
        deskripsi: arsip.header.deskripsi,
        lisensi: arsip.header.lisensi,
        versiTerbaru: versi,
        daftarVersi: {
          [versi]: infoVersiBaru,
        },
        penulis: arsip.header.penulis,
        pemilik: Array.isArray(arsip.header.penulis)
          ? arsip.header.penulis
          : arsip.header.penulis
          ? [arsip.header.penulis]
          : ['pengembang'],
        waktuDibuat: sekarang,
        waktuDiperbarui: sekarang,
      };
    } else {
      meta.daftarVersi[versi] = infoVersiBaru;
      meta.waktuDiperbarui = sekarang;

      // Perbarui versi terbaru jika versi baru lebih tinggi
      try {
        const vLama = uraiVersi(meta.versiTerbaru);
        const vBaru = uraiVersi(versi);
        if (bandingkanVersi(vBaru, vLama) > 0) {
          meta.versiTerbaru = versi;
          meta.deskripsi = arsip.header.deskripsi || meta.deskripsi;
          meta.lisensi = arsip.header.lisensi || meta.lisensi;
        }
      } catch {
        meta.versiTerbaru = versi;
      }
    }

    // 1. Simpan berkas arsip (.npk)
    this.tulisBerkas(jalurArsip, arsip.kontenSerial);

    // 2. Simpan metadata paket (metadata/<nama>.json)
    this.tulisBerkas(jalurMeta, JSON.stringify(meta, null, 2));

    // 3. Perbarui indeks registri (index.json)
    this.perbaruiIndeks(nama);

    return {
      sukses: true,
      nama,
      versi,
      checksum: arsip.checksum,
      pesan: `Paket '${nama}@${versi}' berhasil diterbitkan ke registri lokal.`,
      jalurArsip,
    };
  }

  /**
   * Mengunduh arsip paket dari registri dan memvalidasi keaslian serta integritasnya.
   */
  public unduh(nama: string, versi: string): ArsipPaketData {
    validasiNamaPaket(nama);
    const meta = this.dapatkanMetadata(nama);
    if (!meta) {
      throw new GalatRegistri(`Paket '${nama}' tidak ditemukan di registri lokal.`);
    }

    const infoVersi = meta.daftarVersi[versi];
    if (!infoVersi) {
      const versiTersedia = Object.keys(meta.daftarVersi).join(', ');
      throw new GalatRegistri(
        `Paket '${nama}' versi '${versi}' tidak ditemukan.\nVersi tersedia: ${versiTersedia || 'tidak ada'}`
      );
    }

    const jalurArsip = this.pembaca.gabungJalur(
      this.direktoriBasis,
      'packages',
      nama,
      infoVersi.namaBerkasArsip
    );

    if (!this.pembaca.apakahAda(jalurArsip)) {
      throw new GalatRegistri(
        `Berkas arsip '${infoVersi.namaBerkasArsip}' tidak ditemukan pada jalur penyimpanan registri.`
      );
    }

    const kontenSerial = this.pembaca.baca(jalurArsip);
    const arsip = uraiArsipPaket(kontenSerial);

    // Verifikasi integritas checksum
    if (!this.verifikasiIntegritas(arsip, infoVersi.checksum)) {
      throw new GalatRegistri(
        `Verifikasi integritas paket '${nama}@${versi}' gagal! Checksum arsip tidak cocok dengan metadata registri.`
      );
    }

    return arsip;
  }

  /**
   * Memverifikasi integritas checksum arsip terhadap checksum yang diharapkan.
   */
  public verifikasiIntegritas(arsip: ArsipPaketData, checksumDiharapkan: string): boolean {
    return arsip.checksum === checksumDiharapkan;
  }

  /**
   * Mengambil daftar seluruh nama paket yang ada di registri.
   */
  public daftarSemuaPaket(): string[] {
    const jalurIndex = this.pembaca.gabungJalur(this.direktoriBasis, 'index.json');
    if (!this.pembaca.apakahAda(jalurIndex)) return [];

    try {
      const konten = this.pembaca.baca(jalurIndex);
      const data = JSON.parse(konten);
      return Array.isArray(data.paket) ? data.paket : [];
    } catch {
      return [];
    }
  }

  private perbaruiIndeks(namaBaru: string): void {
    const daftar = this.daftarSemuaPaket();
    if (!daftar.includes(namaBaru)) {
      daftar.push(namaBaru);
      daftar.sort();
      const jalurIndex = this.pembaca.gabungJalur(this.direktoriBasis, 'index.json');
      this.tulisBerkas(jalurIndex, JSON.stringify({ paket: daftar }, null, 2));
    }
  }

  private tulisBerkas(jalur: string, konten: string): void {
    const dirInduk = this.pembaca.direktoriDari(jalur);
    if (typeof (this.pembaca as any).buatDirektori === 'function') {
      (this.pembaca as any).buatDirektori(dirInduk);
    }

    if (typeof (this.pembaca as any).tulis === 'function') {
      (this.pembaca as any).tulis(jalur, konten);
    } else if (typeof (this.pembaca as any).tulisBerkas === 'function') {
      (this.pembaca as any).tulisBerkas(jalur, konten);
    }
  }
}
