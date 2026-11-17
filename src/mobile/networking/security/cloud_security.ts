/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Lapisan Keamanan Mobile & Redaksi Rahasia (Cloud Security Layer)
 */

const KUNCI_POLUSI_PROTOTIPE = new Set(['__proto__', 'constructor', 'prototype']);

export class LapisanKeamananMobile {
  private static readonly POLA_SENSITIF = [
    /password/i,
    /sandi/i,
    /token/i,
    /secret/i,
    /authorization/i,
    /kunci/i,
    /api[-_]?key/i,
    /bearer/i,
    /refresh/i,
  ];

  private static readonly KLAIM_ILEGAL = ['peran', 'role', 'is_admin', 'hak_akses', 'sudo', 'superadmin'];

  /**
   * Sensor nilai rahasia dalam header atau objek data sebelum dicetak ke log
   */
  public static redaksiHeader(headers: Record<string, string>): Record<string, string> {
    const hasil: Record<string, string> = {};
    for (const [kunci, nilai] of Object.entries(headers)) {
      if (KUNCI_POLUSI_PROTOTIPE.has(kunci)) continue;
      if (this.apakahSensitif(kunci)) {
        hasil[kunci] = this.maskingNilai(nilai);
      } else {
        hasil[kunci] = nilai;
      }
    }
    return hasil;
  }

  /**
   * Membersihkan header HTTP dari potensi CRLF injection dan prototype pollution
   */
  public static sanitasiHeader(headers: Record<string, string>): Record<string, string> {
    const bersih: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers || {})) {
      if (!k || KUNCI_POLUSI_PROTOTIPE.has(k)) continue;
      if (/[\r\n\0]/.test(k)) {
        throw new Error(`Nama header mengandung karakter ilegal (CRLF/NUL): '${k}'`);
      }
      const valStr = String(v ?? '');
      if (/[\r\n\0]/.test(valStr)) {
        throw new Error(`Nilai header '${k}' mengandung karakter ilegal (CRLF/NUL).`);
      }
      bersih[k] = valStr;
    }
    return bersih;
  }

  /**
   * Sensor data sensitif dalam objek atau kamus
   */
  public static redaksiData(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.redaksiData(item));
    }
    if (typeof data === 'object') {
      const tersensor: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (KUNCI_POLUSI_PROTOTIPE.has(k)) continue;
        if (this.apakahSensitif(k) && typeof v === 'string') {
          tersensor[k] = this.maskingNilai(v);
        } else {
          tersensor[k] = this.redaksiData(v);
        }
      }
      return tersensor;
    }
    return data;
  }

  /**
   * Memeriksa apakah nama kunci merupakan parameter sensitif
   */
  public static apakahSensitif(kunci: string): boolean {
    return this.POLA_SENSITIF.some((pola) => pola.test(kunci));
  }

  /**
   * Menutupi sebagian besar karakter sensitif
   */
  public static maskingNilai(nilai: string): string {
    if (!nilai) return '';
    if (nilai.length <= 6) return '******';
    const depan = nilai.substring(0, 3);
    const belakang = nilai.substring(nilai.length - 3);
    return `${depan}...***...${belakang}`;
  }

  public static apakahHostLoopback(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  }

  /**
   * Memvalidasi apakah URL aman untuk lingkungan produksi
   */
  public static validasiUrlAman(url: string, lingkungan: 'pengembangan' | 'staging' | 'produksi' = 'produksi'): { valid: boolean; pesan?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, pesan: 'URL tidak boleh kosong.' };
    }

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, pesan: `Skema protokol '${parsed.protocol}' tidak diizinkan untuk HTTP client.` };
      }
      if (parsed.username || parsed.password) {
        return { valid: false, pesan: 'Kredensial tertanam dalam URL (user:pass@host) ditolak demi keamanan.' };
      }
      if (lingkungan === 'produksi' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          pesan: `Protokol tidak aman: '${parsed.protocol}'. Lingkungan produksi mewajibkan HTTPS dengan validasi sertifikat TLS.`,
        };
      }
      return { valid: true };
    } catch {
      return { valid: false, pesan: `Format URL tidak valid: '${url}'` };
    }
  }

  /**
   * Memvalidasi URL WebSocket (ws/wss)
   */
  public static validasiUrlWebSocketAman(url: string, wajibWssEksternal = false): { valid: boolean; pesan?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, pesan: 'URL WebSocket tidak boleh kosong.' };
    }
    try {
      const parsed = new URL(url);
      if (!['ws:', 'wss:'].includes(parsed.protocol)) {
        return { valid: false, pesan: `Protokol WebSocket tidak valid: '${parsed.protocol}'. Gunakan ws:// atau wss://.` };
      }
      if (parsed.username || parsed.password) {
        return { valid: false, pesan: 'Kredensial tertanam dalam URL WebSocket ditolak.' };
      }
      if (wajibWssEksternal && parsed.protocol === 'ws:' && !this.apakahHostLoopback(parsed.hostname)) {
        return { valid: false, pesan: 'Koneksi WebSocket non-lokal mewajibkan protokol terenkripsi wss://.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, pesan: `Format URL WebSocket tidak valid: '${url}'` };
    }
  }

  /**
   * Mencegah upaya pengembang klien menginjeksikan role atau hak akses lokal (termasuk nested object/array & prototype pollution)
   */
  public static periksaKlaimKlien(data: any, kedalaman = 0): { aman: boolean; peringatan?: string } {
    if (data === null || data === undefined || typeof data !== 'object' || kedalaman > 16) {
      return { aman: true };
    }
    if (Array.isArray(data)) {
      for (const item of data) {
        const cek = this.periksaKlaimKlien(item, kedalaman + 1);
        if (!cek.aman) return cek;
      }
      return { aman: true };
    }
    for (const k of Object.keys(data)) {
      if (KUNCI_POLUSI_PROTOTIPE.has(k) || this.KLAIM_ILEGAL.includes(k.toLowerCase())) {
        return {
          aman: false,
          peringatan: `Peringatan Keamanan: Klien mencoba menentukan klaim '${k}' secara langsung. Otorisasi peran wajib diverifikasi di sisi server.`,
        };
      }
      const cekAnak = this.periksaKlaimKlien(data[k], kedalaman + 1);
      if (!cekAnak.aman) return cekAnak;
    }
    return { aman: true };
  }

  /**
   * Membersihkan nama berkas dari upaya manipulasi path traversal & karakter kontrol
   */
  public static amankanNamaBerkas(nama: string): string {
    const bersih = String(nama || '')
      .replace(/\0/g, '')
      .replace(/[\x00-\x1f]/g, '')
      .replace(/\.\./g, '')
      .replace(/[\\/:]/g, '_')
      .trim()
      .replace(/^\.+/, '');
    if (!bersih || /^_+$/.test(bersih)) {
      return '';
    }
    return bersih;
  }
}
