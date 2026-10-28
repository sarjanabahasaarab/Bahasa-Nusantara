/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Authentication & Session Framework (Phase 31)
 * Repositori Pengguna (User Repository) dengan Kueri Berparameter dan Pencegahan Kebocoran Hash.
 */

import { AdaptorBasisdata } from '../database/jenis';
import {
  Pengguna,
  PenggunaProfilAman,
  StatusPengguna,
  PeranBawaan,
  GalatAutentikasi,
  JenisGalatAutentikasi,
} from './jenis';

export class RepositoriPengguna {
  constructor(
    private readonly db: AdaptorBasisdata,
    private readonly namaTabel: string = 'pengguna'
  ) {}

  /**
   * Menginisialisasi skema tabel pengguna dan indeks unik.
   */
  public inisialisasiSkema(): void {
    this.db.eksekusi(`
      CREATE TABLE IF NOT EXISTS ${this.namaTabel} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'pengguna',
        status TEXT NOT NULL DEFAULT 'aktif',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Indeks untuk pencarian cepat berbasis username dan email
    this.db.eksekusi(
      `CREATE INDEX IF NOT EXISTS idx_${this.namaTabel}_username ON ${this.namaTabel}(username)`
    );
    this.db.eksekusi(
      `CREATE INDEX IF NOT EXISTS idx_${this.namaTabel}_email ON ${this.namaTabel}(email)`
    );
  }

  public profilAman(p: Pengguna): PenggunaProfilAman {
    return {
      id: p.id,
      username: p.username,
      email: p.email,
      role: p.role,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  /**
   * Mendaftarkan pengguna baru dengan kueri berparameter.
   */
  public buat(
    username: string,
    email: string,
    passwordHash: string,
    role: PeranBawaan = 'pengguna',
    status: StatusPengguna = 'aktif'
  ): PenggunaProfilAman {
    const userBersih = username.trim().toLowerCase();
    const emailBersih = email.trim().toLowerCase();

    // Validasi format dasar
    if (!/^[a-zA-Z0-9_\.\-]+$/.test(userBersih)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.KREDENSIAL_TIDAK_VALID,
        'Username hanya boleh memuat huruf, angka, garis bawah, titik, dan strip.',
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBersih)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.KREDENSIAL_TIDAK_VALID,
        'Format alamat email tidak valid.',
        400
      );
    }

    // Cek duplikasi sebelum insert
    if (this.cariBerdasarkanUsername(userBersih)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.USERNAME_SUDAH_ADA,
        'Username sudah digunakan oleh akun lain.',
        409
      );
    }

    if (this.cariBerdasarkanEmail(emailBersih)) {
      throw new GalatAutentikasi(
        JenisGalatAutentikasi.EMAIL_SUDAH_ADA,
        'Alamat email sudah terdaftar.',
        409
      );
    }

    const waktuSekarang = new Date().toISOString();

    const hasil = this.db.eksekusi(
      `INSERT INTO ${this.namaTabel} (username, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userBersih, emailBersih, passwordHash, role, status, waktuSekarang, waktuSekarang]
    );

    return {
      id: Number(hasil.idTerakhir),
      username: userBersih,
      email: emailBersih,
      role,
      status,
      created_at: waktuSekarang,
      updated_at: waktuSekarang,
    };
  }

  public cariBerdasarkanId(id: number): Pengguna | null {
    const baris = this.db.ambilSatu<Pengguna>(
      `SELECT * FROM ${this.namaTabel} WHERE id = ?`,
      [id]
    );
    return baris ?? null;
  }

  public cariBerdasarkanUsername(username: string): Pengguna | null {
    const userBersih = username.trim().toLowerCase();
    const baris = this.db.ambilSatu<Pengguna>(
      `SELECT * FROM ${this.namaTabel} WHERE username = ?`,
      [userBersih]
    );
    return baris ?? null;
  }

  public cariBerdasarkanEmail(email: string): Pengguna | null {
    const emailBersih = email.trim().toLowerCase();
    const baris = this.db.ambilSatu<Pengguna>(
      `SELECT * FROM ${this.namaTabel} WHERE email = ?`,
      [emailBersih]
    );
    return baris ?? null;
  }

  public cariBerdasarkanPengenal(pengenal: string): Pengguna | null {
    const pengenalBersih = pengenal.trim().toLowerCase();
    const baris = this.db.ambilSatu<Pengguna>(
      `SELECT * FROM ${this.namaTabel} WHERE username = ? OR email = ?`,
      [pengenalBersih, pengenalBersih]
    );
    return baris ?? null;
  }

  public perbaruiPassword(id: number, passwordHashBaru: string): boolean {
    const waktuSekarang = new Date().toISOString();
    const hasil = this.db.eksekusi(
      `UPDATE ${this.namaTabel} SET password_hash = ?, updated_at = ? WHERE id = ?`,
      [passwordHashBaru, waktuSekarang, id]
    );
    return hasil.barisTerpengaruh > 0;
  }

  public perbaruiStatus(id: number, status: StatusPengguna): boolean {
    const waktuSekarang = new Date().toISOString();
    const hasil = this.db.eksekusi(
      `UPDATE ${this.namaTabel} SET status = ?, updated_at = ? WHERE id = ?`,
      [status, waktuSekarang, id]
    );
    return hasil.barisTerpengaruh > 0;
  }

  public perbaruiPeran(id: number, role: PeranBawaan): boolean {
    const waktuSekarang = new Date().toISOString();
    const hasil = this.db.eksekusi(
      `UPDATE ${this.namaTabel} SET role = ?, updated_at = ? WHERE id = ?`,
      [role, waktuSekarang, id]
    );
    return hasil.barisTerpengaruh > 0;
  }
}
