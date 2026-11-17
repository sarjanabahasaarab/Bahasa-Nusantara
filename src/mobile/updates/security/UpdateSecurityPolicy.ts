/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 42
 * Kebijakan Keamanan Sistem Pembaruan & Sanitasi Jalur (Update Security Policy)
 */

export class UpdateSecurityPolicy {
  // Ekstensi berbahaya / biner eksekusi yang dilarang keras diunduh melalui OTA
  private static readonly EKSTENSI_TERLARANG = new Set([
    '.apk',
    '.aab',
    '.dex',
    '.so',
    '.dylib',
    '.dll',
    '.exe',
    '.bin',
    '.jar',
    '.class',
    '.sh',
    '.bash',
    '.bat',
    '.cmd',
    '.app',
    '.ipa',
    '.elf',
  ]);

  // Batas keamanan resource OTA
  public static readonly MAKS_UKURAN_BERKAS_TUNGGAL = 50 * 1024 * 1024; // 50 MB
  public static readonly MAKS_TOTAL_UKURAN_BUNDLE = 100 * 1024 * 1024; // 100 MB
  public static readonly MAKS_RASIO_DEKOMPRESI = 100; // 100x rasio
  public static readonly MAKS_JUMLAH_BERKAS = 500;

  /**
   * Memvalidasi apakah URL memenuhi persyaratan keamanan HTTPS.
   */
  public static validasiURL(urlStr: string, izinkanLocalhost = true): { valid: boolean; pesan?: string } {
    if (!urlStr || typeof urlStr !== 'string') {
      return { valid: false, pesan: 'URL pembaruan tidak boleh kosong.' };
    }

    try {
      const parsed = new URL(urlStr);
      if (parsed.username || parsed.password) {
        return { valid: false, pesan: 'URL pembaruan tidak boleh memuat kredensial tertanam.' };
      }
      const host = parsed.hostname.toLowerCase();
      const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';

      if (parsed.protocol === 'https:') {
        return { valid: true };
      }
      if (parsed.protocol === 'http:' && izinkanLocalhost && isLoopback) {
        return { valid: true };
      }
      if (parsed.protocol === 'http:') {
        return {
          valid: false,
          pesan: `Protokol tidak aman ke host '${host}'! Pembaruan OTA wajib menggunakan HTTPS terenkripsi.`,
        };
      }
      return {
        valid: false,
        pesan: `Skema URL '${parsed.protocol}' tidak didukung. Wajib https://`,
      };
    } catch {
      return { valid: false, pesan: `Format URL '${urlStr}' tidak valid.` };
    }
  }

  /**
   * Mencegah Path Traversal pada jalur berkas relatif resource.
   */
  public static periksaPathTraversal(jalurRelatif: string): { valid: boolean; pesan?: string } {
    if (!jalurRelatif || typeof jalurRelatif !== 'string') {
      return { valid: false, pesan: 'Jalur resource tidak boleh kosong.' };
    }
    if (jalurRelatif.includes('\0') || /%2e%2e/i.test(jalurRelatif)) {
      return {
        valid: false,
        pesan: `Karakter NUL atau encoded traversal terdeteksi pada jalur '${jalurRelatif}'!`,
      };
    }

    // Normalisasi slash
    const norm = jalurRelatif.replace(/\\/g, '/');

    // Cek traversal ..
    const segmen = norm.split('/');
    if (segmen.some((s) => s === '..')) {
      return {
        valid: false,
        pesan: `Percobaan Path Traversal terdeteksi pada jalur '${jalurRelatif}'!`,
      };
    }

    // Cek absolute path
    if (norm.startsWith('/') || /^[a-zA-Z]:/.test(norm)) {
      return {
        valid: false,
        pesan: `Jalur '${jalurRelatif}' tidak boleh berupa jalur absolut. Wajib relatif terhadap direktori resource.`,
      };
    }

    return { valid: true };
  }

  /**
   * Mengembalikan boolean apakah jalur mengandung path traversal.
   */
  public static apakahMengandungPathTraversal(jalurRelatif: string): boolean {
    return !this.periksaPathTraversal(jalurRelatif).valid;
  }

  /**
   * Mencegah eksekusi biner terlarang dalam resource OTA.
   */
  public static periksaEkstensiAman(jalurBerkas: string): { valid: boolean; pesan?: string } {
    const titikIdx = jalurBerkas.lastIndexOf('.');
    if (titikIdx === -1) return { valid: true };

    const ext = jalurBerkas.slice(titikIdx).toLowerCase();
    if (this.EKSTENSI_TERLARANG.has(ext)) {
      return {
        valid: false,
        pesan: `Ekstensi '${ext}' dilarang keras dalam pembaruan OTA demi kepatuhan kebijakan toko aplikasi dan keamanan runtime.`,
      };
    }

    return { valid: true };
  }

  /**
   * Memvalidasi batas ukuran berkas dan total bundle untuk mencegah Decompression Bomb / DoS.
   */
  public static validasiBatasUkuran(
    ukuranByte: number,
    totalUkuranSaatIni: number,
    jumlahBerkasSaatIni: number
  ): { valid: boolean; pesan?: string } {
    if (ukuranByte > this.MAKS_UKURAN_BERKAS_TUNGGAL) {
      return {
        valid: false,
        pesan: `Ukuran berkas (${(ukuranByte / 1024 / 1024).toFixed(1)} MB) melebihi batas maksimum 50 MB.`,
      };
    }

    if (totalUkuranSaatIni + ukuranByte > this.MAKS_TOTAL_UKURAN_BUNDLE) {
      return {
        valid: false,
        pesan: `Total ukuran paket (${((totalUkuranSaatIni + ukuranByte) / 1024 / 1024).toFixed(1)} MB) melebihi batas bundle 100 MB.`,
      };
    }

    if (jumlahBerkasSaatIni >= this.MAKS_JUMLAH_BERKAS) {
      return {
        valid: false,
        pesan: `Jumlah berkas (${jumlahBerkasSaatIni}) melebihi batas maksimum ${this.MAKS_JUMLAH_BERKAS} berkas.`,
      };
    }

    return { valid: true };
  }

  /**
   * Memeriksa perlindungan Zip-Slip saat ekstraksi berkas arsip.
   */
  public static periksaZipSlip(jalurTujuanDirektori: string, namaEntriArsip: string): boolean {
    const bersihTujuan = jalurTujuanDirektori.replace(/\\/g, '/').replace(/\/+$/, '');
    const bersihEntri = namaEntriArsip.replace(/\\/g, '/');

    const gabung = `${bersihTujuan}/${bersihEntri}`;
    // Jika mengandung .. yang bisa keluar dari root tujuan
    const segmen = gabung.split('/');
    const tumpukan: string[] = [];
    for (const s of segmen) {
      if (s === '..') {
        tumpukan.pop();
      } else if (s && s !== '.') {
        tumpukan.push(s);
      }
    }
    const hasilAkhir = '/' + tumpukan.join('/');
    return hasilAkhir.startsWith(bersihTujuan.startsWith('/') ? bersihTujuan : '/' + bersihTujuan);
  }
}
