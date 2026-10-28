/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Pengelola Sesi (Session Manager) dengan CSPRNG, Token Hashing,
 * Idle & Absolute Expiration, dan Perlindungan Session Fixation.
 */

import { AdaptorBasisdata } from '../database/jenis';
import { Sesi, OpsiSesi, GalatAutentikasi, JenisGalatAutentikasi } from './jenis';
import { acakHex, sha256Hex } from './kriptoAman';

export class PengelolaSesi {
  private opsi: Required<OpsiSesi>;

  constructor(
    private readonly db: AdaptorBasisdata,
    opsi: OpsiSesi = {},
    private readonly namaTabel: string = 'sesi'
  ) {
    this.opsi = {
      namaKuki: opsi.namaKuki || 'nusantara_sesi',
      umurMaksimalDetik: opsi.umurMaksimalDetik ?? 604800, // 7 hari (absolute timeout)
      batasDiamDetik: opsi.batasDiamDetik ?? 86400,        // 24 jam (idle timeout)
      rotasiSetelahLogin: opsi.rotasiSetelahLogin ?? true,
      kukiHttpOnly: opsi.kukiHttpOnly ?? true,
      kukiSecure: opsi.kukiSecure ?? false,
      kukiSameSite: opsi.kukiSameSite || 'Lax',
    };
  }

  public dapatkanNamaKuki(): string {
    return this.opsi.namaKuki;
  }

  public dapatkanOpsiKuki() {
    return {
      httpOnly: this.opsi.kukiHttpOnly,
      secure: this.opsi.kukiSecure,
      sameSite: this.opsi.kukiSameSite,
      maxAge: this.opsi.umurMaksimalDetik,
      path: '/',
    };
  }

  /**
   * Menginisialisasi skema tabel sesi dan indeks token_hash.
   */
  public inisialisasiSkema(): void {
    this.db.eksekusi(`
      CREATE TABLE IF NOT EXISTS ${this.namaTabel} (
        id TEXT PRIMARY KEY,
        pengguna_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_activity TEXT NOT NULL,
        ip_klien TEXT,
        user_agent TEXT
      )
    `);

    this.db.eksekusi(
      `CREATE INDEX IF NOT EXISTS idx_${this.namaTabel}_token_hash ON ${this.namaTabel}(token_hash)`
    );
    this.db.eksekusi(
      `CREATE INDEX IF NOT EXISTS idx_${this.namaTabel}_pengguna_id ON ${this.namaTabel}(pengguna_id)`
    );
  }

  /**
   * Menghasilkan hash SHA-256 dari token sesi untuk penyimpanan server yang aman.
   */
  public static hashToken(token: string): string {
    return sha256Hex(token);
  }

  /**
   * Membuat sesi baru dengan cryptographically secure random token (32 bytes).
   */
  public buatSesi(
    penggunaId: number,
    ipKlien?: string,
    userAgent?: string
  ): { sesi: Sesi; tokenMentah: string } {
    const tokenMentah = acakHex(32);
    const tokenHash = PengelolaSesi.hashToken(tokenMentah);
    const idSesi = acakHex(16);

    const sekarang = new Date();
    const waktuBuat = sekarang.toISOString();
    const waktuKedaluwarsa = new Date(
      sekarang.getTime() + this.opsi.umurMaksimalDetik * 1000
    ).toISOString();

    this.db.eksekusi(
      `INSERT INTO ${this.namaTabel} (id, pengguna_id, token_hash, created_at, expires_at, last_activity, ip_klien, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idSesi, penggunaId, tokenHash, waktuBuat, waktuKedaluwarsa, waktuBuat, ipKlien ?? null, userAgent ?? null]
    );

    const sesi: Sesi = {
      id: idSesi,
      pengguna_id: penggunaId,
      token_hash: tokenHash,
      created_at: waktuBuat,
      expires_at: waktuKedaluwarsa,
      last_activity: waktuBuat,
      ip_klien: ipKlien,
      user_agent: userAgent,
    };

    return { sesi, tokenMentah };
  }

  /**
   * Memvalidasi token sesi klien, memeriksa idle timeout dan absolute timeout.
   */
  public validasiSesi(tokenMentah: string): Sesi | null {
    if (!tokenMentah || typeof tokenMentah !== 'string') {
      return null;
    }

    const tokenHash = PengelolaSesi.hashToken(tokenMentah);
    const sesi = this.db.ambilSatu<Sesi>(
      `SELECT * FROM ${this.namaTabel} WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!sesi) {
      return null;
    }

    const sekarang = Date.now();
    const waktuKedaluwarsa = new Date(sesi.expires_at).getTime();
    const waktuAktivitasTerakhir = new Date(sesi.last_activity).getTime();

    // 1. Cek Absolute Timeout
    if (sekarang >= waktuKedaluwarsa) {
      this.hapusSesi(tokenMentah);
      return null;
    }

    // 2. Cek Idle Timeout
    if (sekarang - waktuAktivitasTerakhir >= this.opsi.batasDiamDetik * 1000) {
      this.hapusSesi(tokenMentah);
      return null;
    }

    // 3. Perbarui waktu aktivitas terakhir (touch session)
    const waktuKiniStr = new Date(sekarang).toISOString();
    this.db.eksekusi(
      `UPDATE ${this.namaTabel} SET last_activity = ? WHERE id = ?`,
      [waktuKiniStr, sesi.id]
    );
    sesi.last_activity = waktuKiniStr;

    return sesi;
  }

  /**
   * Melakukan rotasi sesi untuk mencegah serangan Session Fixation.
   * Menghapus sesi lama dan membuat sesi baru dengan pengguna_id yang sama.
   */
  public rotasiSesi(
    tokenLama: string,
    ipKlien?: string,
    userAgent?: string
  ): { sesi: Sesi; tokenMentah: string } | null {
    const sesiLama = this.validasiSesi(tokenLama);
    if (!sesiLama) {
      return null;
    }

    // Hapus sesi lama
    this.hapusSesi(tokenLama);

    // Terbitkan sesi baru
    return this.buatSesi(sesiLama.pengguna_id, ipKlien, userAgent);
  }

  /**
   * Menghapus sesi tertentu (Logout).
   */
  public hapusSesi(tokenMentah: string): boolean {
    if (!tokenMentah) return false;
    const tokenHash = PengelolaSesi.hashToken(tokenMentah);
    const hasil = this.db.eksekusi(
      `DELETE FROM ${this.namaTabel} WHERE token_hash = ?`,
      [tokenHash]
    );
    return hasil.barisTerpengaruh > 0;
  }

  /**
   * Menghapus semua sesi milik pengguna tertentu (misal saat reset password).
   */
  public hapusSemuaSesiPengguna(penggunaId: number, kecualiToken?: string): number {
    if (kecualiToken) {
      const tokenHashKecuali = PengelolaSesi.hashToken(kecualiToken);
      const hasil = this.db.eksekusi(
        `DELETE FROM ${this.namaTabel} WHERE pengguna_id = ? AND token_hash != ?`,
        [penggunaId, tokenHashKecuali]
      );
      return hasil.barisTerpengaruh;
    }

    const hasil = this.db.eksekusi(
      `DELETE FROM ${this.namaTabel} WHERE pengguna_id = ?`,
      [penggunaId]
    );
    return hasil.barisTerpengaruh;
  }

  /**
   * Membersihkan seluruh sesi yang telah kadaluarsa dari database.
   */
  public bersihkanSesiKadaluarsa(): number {
    const sekarang = new Date().toISOString();
    const hasil = this.db.eksekusi(
      `DELETE FROM ${this.namaTabel} WHERE expires_at < ?`,
      [sekarang]
    );
    return hasil.barisTerpengaruh;
  }
}
