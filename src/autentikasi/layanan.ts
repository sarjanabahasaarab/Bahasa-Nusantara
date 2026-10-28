/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Layanan Autentikasi Terpadu: Registrasi, Login Aman (Anti-Enumeration & Anti-Brute-Force),
 * Manajemen Sesi, RBAC, dan Siklus Hidup Kredensial.
 */

import { AdaptorBasisdata } from '../database/jenis';
import { PermintaanWeb, ResponsWeb } from '../web/jenis';
import { acakHex, sha256Hex } from './kriptoAman';
import {
  Pengguna,
  PenggunaProfilAman,
  Sesi,
  OpsiAutentikasi,
  HasilLogin,
  HasilRegistrasi,
  StatusPengguna,
  PeranBawaan,
  GalatAutentikasi,
  JenisGalatAutentikasi,
} from './jenis';
import { PengelolaPassword } from './password';
import { RepositoriPengguna } from './pengguna';
import { PengelolaSesi } from './sesi';
import { ManajerRBAC } from './rbac';
import { ProteksiCSRF } from './csrf';

interface CatatanPercobaanLogin {
  jumlahGagal: number;
  waktuTerkunciHingga?: number;
}

export class LayananAutentikasi {
  public readonly repoPengguna: RepositoriPengguna;
  public readonly pengelolaPassword: PengelolaPassword;
  public readonly pengelolaSesi: PengelolaSesi;
  public readonly rbac: ManajerRBAC;
  public readonly csrf: ProteksiCSRF;

  private catatanBruteForce: Map<string, CatatanPercobaanLogin> = new Map();
  private readonly maksGagal: number;
  private readonly durasiKunciMs: number;
  private readonly namaTabelReset: string;

  constructor(
    private readonly db: AdaptorBasisdata,
    opsi: OpsiAutentikasi = {}
  ) {
    this.repoPengguna = new RepositoriPengguna(this.db, opsi.namaTabelPengguna || 'pengguna');
    this.pengelolaPassword = new PengelolaPassword(opsi.kebijakanPassword);
    this.pengelolaSesi = new PengelolaSesi(this.db, opsi.opsiSesi, opsi.namaTabelSesi || 'sesi');
    this.rbac = new ManajerRBAC();
    this.csrf = new ProteksiCSRF();

    this.maksGagal = opsi.opsiBruteForce?.maksPercobaanGagal ?? 5;
    this.durasiKunciMs = (opsi.opsiBruteForce?.durasiKunciDetik ?? 900) * 1000;
    this.namaTabelReset = opsi.namaTabelReset || 'reset_password';
  }

  /**
   * Menginisialisasi seluruh skema tabel yang dibutuhkan sistem autentikasi.
   */
  public inisialisasiSkema(): void {
    this.repoPengguna.inisialisasiSkema();
    this.pengelolaSesi.inisialisasiSkema();

    // Skema tabel reset password
    this.db.eksekusi(`
      CREATE TABLE IF NOT EXISTS ${this.namaTabelReset} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pengguna_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        digunakan INTEGER NOT NULL DEFAULT 0
      )
    `);

    this.db.eksekusi(
      `CREATE INDEX IF NOT EXISTS idx_${this.namaTabelReset}_token ON ${this.namaTabelReset}(token_hash)`
    );
  }

  private periksaBruteForce(kunciPengenal: string): void {
    const catatan = this.catatanBruteForce.get(kunciPengenal);
    if (!catatan) return;

    const sekarang = Date.now();
    if (catatan.waktuTerkunciHingga && sekarang < catatan.waktuTerkunciHingga) {
      const sisaDetik = Math.ceil((catatan.waktuTerkunciHingga - sekarang) / 1000);
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.BRUTE_FORCE_TERDETEKSI,
        `Terlalu banyak percobaan login yang gagal. Akun/IP terkunci sementara selama ${sisaDetik} detik.`,
        429
      );
    }
  }

  private catatKegagalanLogin(kunciPengenal: string): void {
    const sekarang = Date.now();
    let catatan = this.catatanBruteForce.get(kunciPengenal);

    if (!catatan) {
      catatan = { jumlahGagal: 1 };
      this.catatanBruteForce.set(kunciPengenal, catatan);
    } else {
      catatan.jumlahGagal++;
    }

    if (catatan.jumlahGagal >= this.maksGagal) {
      catatan.waktuTerkunciHingga = sekarang + this.durasiKunciMs;
    }
  }

  private bersihkanCatatanLogin(kunciPengenal: string): void {
    this.catatanBruteForce.delete(kunciPengenal);
  }

  /**
   * Mendaftarkan pengguna baru dengan validasi dan hashing password aman.
   */
  public registrasi(
    username: string,
    email: string,
    passwordPlain: string,
    role: PeranBawaan = 'pengguna',
    status: StatusPengguna = 'aktif'
  ): HasilRegistrasi {
    const hash = this.pengelolaPassword.hash(passwordPlain);
    const profil = this.repoPengguna.buat(username, email, hash, role, status);
    return {
      sukses: true,
      pengguna: profil,
    };
  }

  /**
   * Melakukan login dengan pencegahan kebocoran eksistensi akun (Timing & Error Safety).
   */
  public login(
    pengenal: string,
    passwordPlain: string,
    ipKlien?: string,
    userAgent?: string
  ): HasilLogin {
    const pengenalKunci = (pengenal || '').trim().toLowerCase();
    const kunciPemeriksaan = `${ipKlien || 'global'}_${pengenalKunci}`;

    // 1. Cek proteksi brute force
    this.periksaBruteForce(kunciPemeriksaan);

    // 2. Cari pengguna
    const pengguna = this.repoPengguna.cariBerdasarkanPengenal(pengenalKunci);

    // Dummy hash untuk timing attack protection saat user tidak ditemukan
    const DUMMY_HASH = '$scrypt$N=16384,r=8,p=1$0123456789abcdef0123456789abcdef$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const hashUntukVerifikasi = pengguna ? pengguna.password_hash : DUMMY_HASH;
    const passwordCocok = this.pengelolaPassword.verifikasi(passwordPlain, hashUntukVerifikasi);

    if (!pengguna || !passwordCocok) {
      this.catatKegagalanLogin(kunciPemeriksaan);
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.KREDENSIAL_TIDAK_VALID,
        'Kredensial login tidak valid.',
        401
      );
    }

    // 3. Cek status akun
    if (pengguna.status !== 'aktif') {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.AKUN_NONAKTIF,
        'Akun Anda saat ini tidak aktif atau ditangguhkan.',
        403
      );
    }

    // 4. Bersihkan catatan kegagalan setelah sukses
    this.bersihkanCatatanLogin(kunciPemeriksaan);

    // 5. Terbitkan sesi baru (Session fixation protection)
    const { sesi, tokenMentah } = this.pengelolaSesi.buatSesi(pengguna.id, ipKlien, userAgent);
    const profil = this.repoPengguna.profilAman(pengguna);

    return {
      sukses: true,
      pengguna: profil,
      sesi,
      tokenSesi: tokenMentah,
      token: tokenMentah,
    };
  }

  /**
   * Menghapus sesi dan cookie (Logout).
   */
  public logout(tokenMentah: string, res?: ResponsWeb): boolean {
    const sukses = this.pengelolaSesi.hapusSesi(tokenMentah);
    if (res) {
      res.hapusKuki(this.pengelolaSesi.dapatkanNamaKuki(), { path: '/' });
    }
    return sukses;
  }

  /**
   * Memvalidasi token sesi secara langsung.
   */
  public validasiSesi(tokenMentah: string): Sesi | null {
    return this.pengelolaSesi.validasiSesi(tokenMentah);
  }

  /**
   * Merotasi token sesi untuk mencegah session fixation.
   */
  public rotasiSesi(
    tokenLama: string,
    ipKlien?: string,
    userAgent?: string
  ): { sesi: Sesi; tokenMentah: string; token: string } | null {
    const hasil = this.pengelolaSesi.rotasiSesi(tokenLama, ipKlien, userAgent);
    if (!hasil) return null;
    return {
      sesi: hasil.sesi,
      tokenMentah: hasil.tokenMentah,
      token: hasil.tokenMentah,
    };
  }

  /**
   * Memvalidasi request masuk, mengekstrak pengguna dan sesi dari cookie atau header Bearer.
   */
  public validasiPermintaan(
    req: PermintaanWeb
  ): { pengguna: PenggunaProfilAman; sesi: Sesi; tokenSesi: string } | null {
    // 1. Ekstrak token dari Cookie
    let token = req.ambilKuki(this.pengelolaSesi.dapatkanNamaKuki());

    // 2. Jika tidak ada di Cookie, cek Authorization: Bearer <token>
    if (!token) {
      const authHeader = req.ambilTajuk('authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      return null;
    }

    // 3. Validasi sesi
    const sesi = this.pengelolaSesi.validasiSesi(token);
    if (!sesi) {
      return null;
    }

    // 4. Ambil profil pengguna
    const pengguna = this.repoPengguna.cariBerdasarkanId(sesi.pengguna_id);
    if (!pengguna || pengguna.status !== 'aktif') {
      this.pengelolaSesi.hapusSesi(token);
      return null;
    }

    const profil = this.repoPengguna.profilAman(pengguna);

    // Sematkan ke req untuk diakses handler
    (req as any).pengguna = profil;
    (req as any).sesi = sesi;
    (req as any).tokenSesi = token;

    return { pengguna: profil, sesi, tokenSesi: token };
  }

  /**
   * Mengubah password pengguna dan menginvalidasi seluruh sesi lain.
   */
  public ubahPassword(
    penggunaId: number,
    passwordLama: string,
    passwordBaru: string,
    tokenSesiSaatIni?: string
  ): boolean {
    const pengguna = this.repoPengguna.cariBerdasarkanId(penggunaId);
    if (!pengguna) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.KREDENSIAL_TIDAK_VALID,
        'Pengguna tidak ditemukan.',
        404
      );
    }

    // Verifikasi password saat ini
    if (!this.pengelolaPassword.verifikasi(passwordLama, pengguna.password_hash)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.KREDENSIAL_TIDAK_VALID,
        'Password saat ini salah.',
        400
      );
    }

    // Hash password baru
    const hashBaru = this.pengelolaPassword.hash(passwordBaru);
    this.repoPengguna.perbaruiPassword(penggunaId, hashBaru);

    // Invalidasi seluruh sesi lain milik pengguna ini demi keamanan
    this.pengelolaSesi.hapusSemuaSesiPengguna(penggunaId, tokenSesiSaatIni);

    return true;
  }

  /**
   * Membuat token reset password acak berbatas waktu (1 jam).
   * Alamat email divalidasi tanpa membocorkan eksistensi pengguna ke pihak luar.
   */
  public buatTokenResetPassword(email: string): { token: string; expiresAt: string } | null {
    const pengguna = this.repoPengguna.cariBerdasarkanEmail(email);
    if (!pengguna) {
      return null; // Pengembalian aman (anti-enumeration)
    }

    const tokenMentah = acakHex(32);
    const tokenHash = sha256Hex(tokenMentah);

    const sekarang = new Date();
    const expiresAt = new Date(sekarang.getTime() + 3600 * 1000).toISOString(); // 1 jam

    this.db.eksekusi(
      `INSERT INTO ${this.namaTabelReset} (pengguna_id, token_hash, created_at, expires_at, digunakan) VALUES (?, ?, ?, ?, 0)`,
      [pengguna.id, tokenHash, sekarang.toISOString(), expiresAt]
    );

    return { token: tokenMentah, expiresAt };
  }

  /**
   * Mengeksekusi reset password menggunakan token reset satu-kali-pakai.
   */
  public eksekusiResetPassword(tokenMentah: string, passwordBaru: string): boolean {
    if (!tokenMentah) return false;

    const tokenHash = sha256Hex(tokenMentah);
    const resetData = this.db.ambilSatu<{
      id: number;
      pengguna_id: number;
      expires_at: string;
      digunakan: number;
    }>(
      `SELECT * FROM ${this.namaTabelReset} WHERE token_hash = ? AND digunakan = 0`,
      [tokenHash]
    );

    if (!resetData) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.TOKEN_RESET_KADALUARSA,
        'Token reset password tidak valid atau sudah digunakan.',
        400
      );
    }

    const sekarang = Date.now();
    if (sekarang > new Date(resetData.expires_at).getTime()) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.TOKEN_RESET_KADALUARSA,
        'Token reset password telah kadaluarsa.',
        400
      );
    }

    // Hash password baru
    const hashBaru = this.pengelolaPassword.hash(passwordBaru);
    this.repoPengguna.perbaruiPassword(resetData.pengguna_id, hashBaru);

    // Tandai token telah digunakan
    this.db.eksekusi(
      `UPDATE ${this.namaTabelReset} SET digunakan = 1 WHERE id = ?`,
      [resetData.id]
    );

    // Invalidasi seluruh sesi pengguna
    this.pengelolaSesi.hapusSemuaSesiPengguna(resetData.pengguna_id);

    return true;
  }
}
