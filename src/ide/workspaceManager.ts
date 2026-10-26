/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengelola Ruang Kerja (Workspace Manager) IDE NUSANTARA (Phase 26)
 */

import { SimpulBerkas, HasilPencarianBerkas } from './types';
import { normalisasiJalur, gabungJalur } from '../build/jalur';
import { parse as parseTOML } from 'smol-toml';

export interface KonfigurasiProyekNUSANTARA {
  nama: string;
  versi: string;
  deskripsi: string;
  penulis?: string;
  dependensi?: Record<string, string>;
}

export class ManajerRuangKerja {
  private berkasPeta = new Map<string, string>();
  private direktoriAkar = '/proyek';

  constructor(berkasAwal?: Record<string, string>) {
    if (berkasAwal && Object.keys(berkasAwal).length > 0) {
      for (const [jalur, konten] of Object.entries(berkasAwal)) {
        this.berkasPeta.set(this.bersihkanJalur(jalur), konten);
      }
    } else {
      this.inisialisasiProyekPercontohan();
    }
  }

  /**
   * Menyiapkan struktur proyek percontohan standar NUSANTARA.
   */
  public inisialisasiProyekPercontohan(): void {
    this.berkasPeta.clear();

    // 1. Manifest Proyek
    this.berkasPeta.set(
      '/proyek/nusantara.toml',
      `# Berkas Konfigurasi Proyek NUSANTARA
[nusantara]
nama = "aplikasi_nusantara"
versi = "0.26.0"
deskripsi = "Proyek Aplikasi Resmi Menggunakan Bahasa NUSANTARA"
penulis = "Pengembang NUSANTARA"
lisensi = "Apache-2.0"

[dependensi]
matematika = "1.0.0"
`
    );

    // 2. Berkas Utama Program
    this.berkasPeta.set(
      '/proyek/src/utama.nusantara',
      `// Program Utama NUSANTARA
program AplikasiUtama

gunakan "matematika" sebagai mtk
impor { hitung_pangkat, kuadrat } dari "./matematika_ekstra"

fungsi sapa(nama: teks) : teks
mulai
    pesan : teks = "Selamat Datang di NUSANTARA IDE, " + nama + "!"
    kembalikan pesan
selesai

mulai
    tampilkan(sapa("Pengembang"))
    
    // Perhitungan matematika
    angka : bilangan = 5
    hasilKuadrat : bilangan = kuadrat(angka)
    tampilkan("Hasil kuadrat dari", angka, "adalah", hasilKuadrat)
    
    // Perulangan berhitung
    total : bilangan = 0
    untuk i dari 1 sampai 4 lakukan
        total = total + i
    akhir
    tampilkan("Total akumulasi 1 sampai 4:", total)
selesai
`
    );

    // 3. Modul Ekstra
    this.berkasPeta.set(
      '/proyek/src/matematika_ekstra.nusantara',
      `// Modul Matematika Tambahan
modul MatematikaEkstra

ekspor fungsi kuadrat(x: bilangan) : bilangan
mulai
    kembalikan x * x
selesai

ekspor fungsi hitung_pangkat(basis: bilangan, eksponen: bilangan) : bilangan
mulai
    hasil : bilangan = 1
    penghitung : bilangan = 1
    selama penghitung <= eksponen lakukan
        hasil = hasil * basis
        penghitung = penghitung + 1
    akhir
    kembalikan hasil
selesai
`
    );

    // 4. Berkas Pengujian Unit
    this.berkasPeta.set(
      '/proyek/pengujian/utama_test.nusantara',
      `// Berkas Pengujian Unit Proyek
program UjiMatematika

impor { kuadrat, hitung_pangkat } dari "../src/matematika_ekstra"

mulai
    pastikan_sama(kuadrat(4), 16, "Kuadrat 4 harus sama dengan 16")
    pastikan_sama(hitung_pangkat(2, 3), 8, "2 pangkat 3 harus sama dengan 8")
    tampilkan("[✓] Seluruh pengujian unit modul berhasil!")
selesai
`
    );

    // 5. Dokumentasi Proyek
    this.berkasPeta.set(
      '/proyek/docs/panduan.md',
      `# Panduan Proyek NUSANTARA

Selamat datang di proyek contoh Bahasa NUSANTARA.

## Struktur Direktori
- \`src/\`: Kode sumber utama program
- \`pengujian/\`: Pengujian unit dan integrasi
- \`docs/\`: Dokumentasi pengembangan
- \`nusantara.toml\`: Konfigurasi paket dan dependensi

## Perintah Cepat
- Jalankan: Tekan **F5** atau tombol **Jalankan Program**
- Format: Tekan **Ctrl+S** untuk menyimpan dan memformat
- Debug: Pasang titik henti di gutter nomor baris
`
    );
  }

  public dapatkanDirektoriAkar(): string {
    return this.direktoriAkar;
  }

  public bacaBerkas(jalur: string): string {
    const bersih = this.bersihkanJalur(jalur);
    const konten = this.berkasPeta.get(bersih);
    if (konten === undefined) {
      throw new Error(`Berkas tidak ditemukan: ${jalur}`);
    }
    return konten;
  }

  public apakahAda(jalur: string): boolean {
    const bersih = this.bersihkanJalur(jalur);
    return this.berkasPeta.has(bersih);
  }

  public simpanBerkas(jalur: string, konten: string): boolean {
    const bersih = this.bersihkanJalur(jalur);
    this.berkasPeta.set(bersih, konten);
    return true;
  }

  public buatBerkas(jalur: string, kontenAwal: string = ''): boolean {
    const bersih = this.bersihkanJalur(jalur);
    this.berkasPeta.set(bersih, kontenAwal);
    return true;
  }

  public buatFolder(jalur: string): boolean {
    const bersih = this.bersihkanJalur(jalur);
    // Tambahkan file placeholder .gitkeep agar folder terdaftar di pohon
    const placeholder = gabungJalur(bersih, '.gitkeep');
    this.berkasPeta.set(placeholder, '');
    return true;
  }

  public gantiNama(jalurLama: string, jalurBaru: string): boolean {
    const bersihLama = this.bersihkanJalur(jalurLama);
    const bersihBaru = this.bersihkanJalur(jalurBaru);

    // Kasus 1: Ganti nama satu berkas tunggal
    if (this.berkasPeta.has(bersihLama)) {
      const konten = this.berkasPeta.get(bersihLama)!;
      this.berkasPeta.delete(bersihLama);
      this.berkasPeta.set(bersihBaru, konten);
      return true;
    }

    // Kasus 2: Ganti nama folder (prefix match)
    const awalanLama = bersihLama.endsWith('/') ? bersihLama : bersihLama + '/';
    const awalanBaru = bersihBaru.endsWith('/') ? bersihBaru : bersihBaru + '/';
    const entriPindah: [string, string][] = [];

    for (const [k, v] of this.berkasPeta.entries()) {
      if (k.startsWith(awalanLama)) {
        const sub = k.substring(awalanLama.length);
        entriPindah.push([k, awalanBaru + sub]);
      }
    }

    if (entriPindah.length === 0) return false;

    for (const [lama, baru] of entriPindah) {
      const val = this.berkasPeta.get(lama)!;
      this.berkasPeta.delete(lama);
      this.berkasPeta.set(baru, val);
    }
    return true;
  }

  public hapus(jalur: string): boolean {
    const bersih = this.bersihkanJalur(jalur);

    // Hapus satu berkas
    if (this.berkasPeta.has(bersih)) {
      return this.berkasPeta.delete(bersih);
    }

    // Hapus satu folder (semua anak berkas yang berawalan jalur/)
    const awalan = bersih.endsWith('/') ? bersih : bersih + '/';
    let adaYangDihapus = false;
    for (const k of Array.from(this.berkasPeta.keys())) {
      if (k.startsWith(awalan)) {
        this.berkasPeta.delete(k);
        adaYangDihapus = true;
      }
    }
    return adaYangDihapus;
  }

  /**
   * Pencarian teks terindeks di seluruh berkas proyek.
   */
  public cariDalamBerkas(
    kueri: string,
    filterEkstensi?: string
  ): HasilPencarianBerkas[] {
    const hasil: HasilPencarianBerkas[] = [];
    const kueriKecil = kueri.toLowerCase();

    if (!kueri.trim()) return hasil;

    for (const [jalur, konten] of this.berkasPeta.entries()) {
      if (jalur.endsWith('.gitkeep')) continue;
      if (filterEkstensi && !jalur.endsWith(filterEkstensi)) continue;

      const namaBerkas = jalur.split('/').pop() || jalur;
      const barisList = konten.split('\n');

      for (let i = 0; i < barisList.length; i++) {
        const barisTeks = barisList[i];
        let pos = barisTeks.toLowerCase().indexOf(kueriKecil);
        while (pos !== -1) {
          hasil.push({
            jalurBerkas: jalur,
            namaBerkas,
            baris: i + 1,
            kolom: pos + 1,
            cuplikanTeks: barisTeks.trim(),
            panjangCocok: kueri.length,
          });
          pos = barisTeks.toLowerCase().indexOf(kueriKecil, pos + 1);
        }
      }
    }

    return hasil;
  }

  /**
   * Menghasilkan pohon berkas hierarkis untuk ditampilkan pada Project Explorer.
   */
  public dapatkanStrukturPohon(): SimpulBerkas {
    const akar: SimpulBerkas = {
      jalur: this.direktoriAkar,
      nama: 'proyek',
      apakahDirektori: true,
      anak: [],
    };

    // Urutkan seluruh berkas
    const daftarJalur = Array.from(this.berkasPeta.keys()).sort();

    for (const jalur of daftarJalur) {
      if (jalur.endsWith('.gitkeep')) {
        // Daftarkan foldernya tanpa menampilkan berkas .gitkeep
        const folderJalur = jalur.substring(0, jalur.lastIndexOf('/'));
        this.masukkanKePohon(akar, folderJalur, true);
        continue;
      }
      this.masukkanKePohon(akar, jalur, false);
    }

    return akar;
  }

  private masukkanKePohon(akar: SimpulBerkas, jalurLengkap: string, hanyaFolder: boolean): void {
    let relatif = jalurLengkap.startsWith(this.direktoriAkar)
      ? jalurLengkap.substring(this.direktoriAkar.length)
      : jalurLengkap;
    relatif = relatif.replace(/^\/+/, '');

    if (!relatif) return;

    const segmen = relatif.split('/');
    let simpulSaatIni = akar;

    for (let i = 0; i < segmen.length; i++) {
      const bagian = segmen[i];
      const apakahTerakhir = i === segmen.length - 1;
      const apakahDir = !apakahTerakhir || hanyaFolder;

      let anak = simpulSaatIni.anak?.find(a => a.nama === bagian);
      if (!anak) {
        anak = {
          jalur: gabungJalur(simpulSaatIni.jalur, bagian),
          nama: bagian,
          apakahDirektori: apakahDir,
          ekstensi: apakahDir ? undefined : bagian.split('.').pop(),
          anak: apakahDir ? [] : undefined,
        };
        simpulSaatIni.anak = simpulSaatIni.anak || [];
        simpulSaatIni.anak.push(anak);

        // Urutkan: folder di atas, berkas di bawah, alfabetis
        simpulSaatIni.anak.sort((a, b) => {
          if (a.apakahDirektori !== b.apakahDirektori) {
            return a.apakahDirektori ? -1 : 1;
          }
          return a.nama.localeCompare(b.nama);
        });
      }
      simpulSaatIni = anak;
    }
  }

  public muatManifest(): KonfigurasiProyekNUSANTARA | undefined {
    const jalurManifest = `${this.direktoriAkar}/nusantara.toml`;
    if (!this.berkasPeta.has(jalurManifest)) return undefined;

    try {
      const teks = this.berkasPeta.get(jalurManifest)!;
      const parsed = parseTOML(teks) as any;
      const n = parsed?.nusantara || {};
      return {
        nama: n.nama || 'nusantara_app',
        versi: n.versi || '0.26.0',
        deskripsi: n.deskripsi || '',
        penulis: n.penulis,
        dependensi: parsed?.dependensi || {},
      };
    } catch {
      return undefined;
    }
  }

  public dapatkanSemuaBerkas(): Map<string, string> {
    return new Map(this.berkasPeta);
  }

  private bersihkanJalur(jalur: string): string {
    const norm = normalisasiJalur(jalur);
    if (!norm.startsWith('/')) {
      return gabungJalur(this.direktoriAkar, norm);
    }
    return norm;
  }
}
