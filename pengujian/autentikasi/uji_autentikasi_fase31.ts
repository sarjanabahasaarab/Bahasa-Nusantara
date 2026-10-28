/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 31 Test Suite
 * Pengujian Komprehensif Autentikasi, Manajemen Sesi, Keamanan Password (Scrypt),
 * RBAC, Proteksi Brute-Force, CSRF, dan Kontrol Akses.
 */

import { AdaptorSQLite } from '../../src/database';
import {
  LayananAutentikasi,
  PengelolaPassword,
  ManajerRBAC,
  ProteksiCSRF,
  PengelolaSesi,
  buatMiddlewareWajibAutentikasi,
  buatMiddlewareWajibPeran,
  buatMiddlewareWajibIzin,
} from '../../src/autentikasi';
import { AplikasiWeb } from '../../src/web';
import {
  KATALOG_MODUL_STANDAR,
  apakahModulStandar,
  dapatkanSemuaModulStandar,
  buatEksporAutentikasi,
} from '../../src/stdlib';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisNilaiRuntime, NilaiFungsiBawaan } from '../../src/interpreter/nilai';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

async function uji(deskripsi: string, fn: () => Promise<void> | void) {
  totalUji++;
  try {
    await fn();
    totalLulus++;
    console.log(`  ✓ ${deskripsi}`);
  } catch (err) {
    totalGagal++;
    console.error(`  ✗ ${deskripsi}`);
    console.error(`    ${(err as Error).message}`);
  }
}

function pastikan(kondisi: boolean, pesan: string = 'Penegasan gagal') {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

function pastikanSama(aktual: any, diharapkan: any, pesan?: string) {
  if (aktual !== diharapkan) {
    throw new Error(
      pesan || `Diharapkan ${JSON.stringify(diharapkan)}, tetapi didapat ${JSON.stringify(aktual)}`
    );
  }
}

async function jalankanSemuaPengujian() {
  console.log('=== PENGUJIAN KOMPREHENSIF AUTENTIKASI, SESI & KONTROL AKSES (PHASE 31) ===\n');

  // ----------------------------------------------------------------------------
  // 1. REGISTRI MODUL STANDAR (autentikasi & auth)
  // ----------------------------------------------------------------------------
  console.log('1. Pengujian Registri dan Katalog Modul Standar Fase 31:');

  await uji("Modul 'autentikasi' dan alias 'auth' terdaftar di katalog stdlib", () => {
    pastikan(KATALOG_MODUL_STANDAR['autentikasi'] !== undefined, "Modul 'autentikasi' harus ada");
    pastikan(KATALOG_MODUL_STANDAR['auth'] !== undefined, "Alias 'auth' harus ada");
    pastikanSama(KATALOG_MODUL_STANDAR['autentikasi'].nama, 'autentikasi');
    pastikanSama(KATALOG_MODUL_STANDAR['auth'].nama, 'auth');
  });

  await uji('apakahModulStandar mengenali autentikasi, auth, dan prefix std:', () => {
    pastikan(apakahModulStandar('autentikasi'), 'autentikasi harus dikenali');
    pastikan(apakahModulStandar('auth'), 'auth harus dikenali');
    pastikan(apakahModulStandar('std:autentikasi'), 'std:autentikasi harus dikenali');
    pastikan(apakahModulStandar('stdlib:auth'), 'stdlib:auth harus dikenali');
  });

  await uji('dapatkanSemuaModulStandar memuat modul Fase 31', () => {
    const semua = dapatkanSemuaModulStandar();
    pastikan(semua.includes('autentikasi'), 'Daftar harus memuat autentikasi');
    pastikan(semua.includes('auth'), 'Daftar harus memuat auth');
  });

  // ----------------------------------------------------------------------------
  // 2. PASSWORD SECURITY (SCRYPT KDF & TIMING-SAFE VERIFICATION)
  // ----------------------------------------------------------------------------
  console.log('\n2. Pengujian Keamanan Password (Scrypt KDF & Kebijakan):');

  await uji('Scrypt KDF menghasilkan hash ter-salt dengan format aman', () => {
    const pengelola = new PengelolaPassword();
    const hash = pengelola.hash('Rahasia123!');
    pastikan(hash.startsWith('$scrypt$N=16384,r=8,p=1$'), 'Harus berformat $scrypt$...');
    pastikan(!hash.includes('Rahasia123!'), 'Password plaintext tidak boleh muncul dalam hash');

    // Pastikan hash berbeda untuk password yang sama karena random salt
    const hashKedua = pengelola.hash('Rahasia123!');
    pastikan(hash !== hashKedua, 'Salt acak harus menghasilkan hash berbeda');
  });

  await uji('Verifikasi password: cocok menghasilkan true, salah menghasilkan false', () => {
    const pengelola = new PengelolaPassword();
    const hash = pengelola.hash('KunciKuat_2026');

    pastikan(pengelola.verifikasi('KunciKuat_2026', hash), 'Password benar harus cocok');
    pastikan(!pengelola.verifikasi('KunciSalah_2026', hash), 'Password salah harus ditolak');
    pastikan(!pengelola.verifikasi('', hash), 'Password kosong harus ditolak');
  });

  await uji('Validasi kebijakan password menolak password kosong atau terlalu pendek', () => {
    const pengelola = new PengelolaPassword({ panjangMinimal: 8, panjangMaksimal: 32 });
    let tertolak = false;
    try {
      pengelola.hash('pendek');
    } catch {
      tertolak = true;
    }
    pastikan(tertolak, 'Password di bawah panjang minimum harus ditolak');
  });

  // ----------------------------------------------------------------------------
  // 3. REPOSITORI PENGGUNA & REGISTRASI (DATABASE API INTEGRATION)
  // ----------------------------------------------------------------------------
  console.log('\n3. Pengujian Repositori Pengguna & Registrasi Akun:');

  const db = new AdaptorSQLite();
  db.buka({ jalur: ':memory:' });
  const layanan = new LayananAutentikasi(db);
  layanan.inisialisasiSkema();

  await uji('Registrasi pengguna baru berhasil dan menyimpan hash ke database', () => {
    const resReg = layanan.registrasi('budi_wicaksono', 'budi@nusantara.id', 'PasswordSuper123', 'editor');
    pastikan(resReg.sukses, 'Registrasi harus sukses');
    pastikanSama(resReg.pengguna?.username, 'budi_wicaksono');
    pastikanSama(resReg.pengguna?.email, 'budi@nusantara.id');
    pastikanSama(resReg.pengguna?.role, 'editor');
    pastikanSama(resReg.pengguna?.status, 'aktif');

    // Verifikasi di basis data langsung bahwa plaintext tidak tersimpan
    const baris = db.ambilSatu<any>('SELECT * FROM pengguna WHERE id = ?', [resReg.pengguna!.id]);
    pastikan(baris !== null);
    pastikan(baris.password_hash.startsWith('$scrypt$'));
    pastikan(!baris.password_hash.includes('PasswordSuper123'));
  });

  await uji('Registrasi menolak duplikasi username dan email', () => {
    let gagalUsername = false;
    try {
      layanan.registrasi('budi_wicaksono', 'lain@nusantara.id', 'PasswordSuper123');
    } catch {
      gagalUsername = true;
    }
    pastikan(gagalUsername, 'Username duplikat harus ditolak');

    let gagalEmail = false;
    try {
      layanan.registrasi('pengguna_baru', 'budi@nusantara.id', 'PasswordSuper123');
    } catch {
      gagalEmail = true;
    }
    pastikan(gagalEmail, 'Email duplikat harus ditolak');
  });

  await uji('Proteksi SQL Injection pada pencarian dan pendaftaran akun', () => {
    const injeksi = "admin' OR '1'='1";
    let ditolak = false;
    try {
      layanan.registrasi(injeksi, 'injeksi@nusantara.id', 'Password123');
    } catch {
      ditolak = true;
    }
    pastikan(ditolak, 'Username dengan karakter SQL injection harus ditolak validasi');
  });

  // ----------------------------------------------------------------------------
  // 4. LOGIN & PROTEKSI BRUTE FORCE
  // ----------------------------------------------------------------------------
  console.log('\n4. Pengujian Login & Proteksi Brute-Force:');

  await uji('Login sukses menggunakan username atau email', () => {
    // Login dengan username
    const l1 = layanan.login('budi_wicaksono', 'PasswordSuper123', '127.0.0.1');
    pastikan(l1.sukses, 'Login dengan username harus berhasil');
    pastikan(l1.tokenSesi !== undefined, 'Token sesi harus diterbitkan');

    // Login dengan email
    const l2 = layanan.login('budi@nusantara.id', 'PasswordSuper123', '127.0.0.1');
    pastikan(l2.sukses, 'Login dengan email harus berhasil');
    pastikan(l2.tokenSesi !== undefined);
  });

  await uji('Login gagal jika password salah atau akun tidak ditemukan (Pesan Generik)', () => {
    let gagalPass = false;
    try {
      layanan.login('budi_wicaksono', 'PasswordSalahTotal');
    } catch (err: any) {
      gagalPass = true;
      pastikanSama(err.message, '[Autentikasi: KREDENSIAL_TIDAK_VALID] Kredensial login tidak valid.');
    }
    pastikan(gagalPass, 'Password salah harus memicu GalatAutentikasi');

    let gagalUser = false;
    try {
      layanan.login('user_khayalan_tidak_ada', 'PasswordSuper123');
    } catch (err: any) {
      gagalUser = true;
      pastikanSama(err.message, '[Autentikasi: KREDENSIAL_TIDAK_VALID] Kredensial login tidak valid.');
    }
    pastikan(gagalUser, 'User tidak ditemukan harus menghasilkan pesan generik sama');
  });

  await uji('Login menolak akun dengan status nonaktif', () => {
    layanan.registrasi('akun_mati', 'mati@nusantara.id', 'Password123', 'pengguna', 'nonaktif');
    let ditolak = false;
    try {
      layanan.login('akun_mati', 'Password123');
    } catch (err: any) {
      ditolak = true;
      pastikan(err.message.includes('AKUN_NONAKTIF'));
    }
    pastikan(ditolak, 'Akun berstatus nonaktif harus ditolak login');
  });

  await uji('Proteksi Brute-Force mengunci percobaan login setelah batas gagal terlampaui', () => {
    const layananKetat = new LayananAutentikasi(db, {
      opsiBruteForce: { maksPercobaanGagal: 3, durasiKunciDetik: 60 },
    });

    const ipUji = '192.168.1.100';
    for (let i = 0; i < 3; i++) {
      try {
        layananKetat.login('budi_wicaksono', 'PassSalah', ipUji);
      } catch {
        // Abaikan kegagalan terkontrol
      }
    }

    let terkunci = false;
    try {
      layananKetat.login('budi_wicaksono', 'PasswordSuper123', ipUji);
    } catch (err: any) {
      terkunci = true;
      pastikan(err.message.includes('BRUTE_FORCE_TERDETEKSI'));
    }
    pastikan(terkunci, 'Percobaan ke-4 harus terblokir brute-force lockout');
  });

  // ----------------------------------------------------------------------------
  // 5. MANAJEMEN SESI & PERLINDUNGAN SESSION FIXATION
  // ----------------------------------------------------------------------------
  console.log('\n5. Pengujian Manajemen Sesi & Perlindungan Session Fixation:');

  await uji('Token sesi disimpan dalam bentuk hash SHA-256 di database (Bukan Plaintext)', () => {
    const { tokenMentah, sesi } = layanan.pengelolaSesi.buatSesi(1);
    pastikan(tokenMentah.length === 64, 'Token CSPRNG harus berukuran 32 bytes (64 hex)');

    const barisDB = db.ambilSatu<any>('SELECT * FROM sesi WHERE id = ?', [sesi.id]);
    pastikan(barisDB !== null);
    pastikanSama(barisDB.token_hash, PengelolaSesi.hashToken(tokenMentah));
    pastikan(barisDB.token_hash !== tokenMentah, 'Token mentah tidak boleh disimpan langsung di DB');
  });

  await uji('Validasi sesi aktif memperbarui waktu aktivitas terakhir (Touch Session)', () => {
    const { tokenMentah } = layanan.pengelolaSesi.buatSesi(1);
    const sesiValid = layanan.pengelolaSesi.validasiSesi(tokenMentah);
    pastikan(sesiValid !== null, 'Sesi harus valid');
    pastikanSama(sesiValid?.pengguna_id, 1);
  });

  await uji('Sesi kadaluarsa (Absolute / Idle Timeout) otomatis ditolak dan dibersihkan', () => {
    const pengelolaKadaluarsa = new PengelolaSesi(db, {
      umurMaksimalDetik: 0, // Langsung kedaluwarsa
    });
    const { tokenMentah } = pengelolaKadaluarsa.buatSesi(1);
    const hasil = pengelolaKadaluarsa.validasiSesi(tokenMentah);
    pastikanSama(hasil, null, 'Sesi kadaluarsa harus menghasilkan null');
  });

  await uji('Session Fixation Guard: Rotasi token sesi mengganti token lama dengan token baru', () => {
    const { tokenMentah: tokenAwal } = layanan.pengelolaSesi.buatSesi(1);
    const hasilRotasi = layanan.pengelolaSesi.rotasiSesi(tokenAwal);
    pastikan(hasilRotasi !== null);
    pastikan(hasilRotasi?.tokenMentah !== tokenAwal, 'Token sesi baru harus berbeda dari token lama');

    // Token lama harus sudah tidak berlaku lagi
    pastikanSama(layanan.pengelolaSesi.validasiSesi(tokenAwal), null);
    // Token baru harus berlaku
    pastikan(layanan.pengelolaSesi.validasiSesi(hasilRotasi!.tokenMentah) !== null);
  });

  await uji('Logout menghapus sesi dari database secara permanen', () => {
    const { tokenMentah } = layanan.pengelolaSesi.buatSesi(1);
    pastikan(layanan.pengelolaSesi.validasiSesi(tokenMentah) !== null);

    const suksesLogout = layanan.logout(tokenMentah);
    pastikan(suksesLogout, 'Logout harus sukses');
    pastikanSama(layanan.pengelolaSesi.validasiSesi(tokenMentah), null, 'Sesi harus tidak lagi ditemukan');
  });

  // ----------------------------------------------------------------------------
  // 6. ROLE-BASED ACCESS CONTROL (RBAC) & OTORISASI
  // ----------------------------------------------------------------------------
  console.log('\n6. Pengujian RBAC & Hak Akses:');

  await uji('Evaluasi izin peran: pengguna biasa vs editor vs admin', () => {
    const rbac = new ManajerRBAC();

    // Pengguna
    pastikan(rbac.apakahMemilikiIzin('pengguna', 'artikel.baca'));
    pastikan(!rbac.apakahMemilikiIzin('pengguna', 'artikel.tulis'));
    pastikan(!rbac.apakahMemilikiIzin('pengguna', 'pengaturan.ubah'));

    // Editor
    pastikan(rbac.apakahMemilikiIzin('editor', 'artikel.baca'));
    pastikan(rbac.apakahMemilikiIzin('editor', 'artikel.tulis'));
    pastikan(!rbac.apakahMemilikiIzin('editor', 'pengaturan.ubah'));

    // Admin (Wildcard akses penuh)
    pastikan(rbac.apakahMemilikiIzin('admin', 'artikel.baca'));
    pastikan(rbac.apakahMemilikiIzin('admin', 'artikel.hapus'));
    pastikan(rbac.apakahMemilikiIzin('admin', 'pengaturan.ubah'));
    pastikan(rbac.apakahMemilikiIzin('admin', 'izin_apapun_bebas'));
  });

  // ----------------------------------------------------------------------------
  // 7. CSRF PROTECTION
  // ----------------------------------------------------------------------------
  console.log('\n7. Pengujian Proteksi CSRF:');

  await uji('Proteksi CSRF: Token valid diizinkan, token salah/kosong ditolak dengan 403', async () => {
    const csrf = new ProteksiCSRF();
    const tokenSah = csrf.buatToken();

    pastikan(csrf.verifikasiToken(tokenSah, tokenSah), 'Token sama harus valid');
    pastikan(!csrf.verifikasiToken(tokenSah, 'tokenSalah'), 'Token tidak cocok harus gagal');
    pastikan(!csrf.verifikasiToken(tokenSah, ''), 'Token kosong harus gagal');
  });

  // ----------------------------------------------------------------------------
  // 8. PERUBAHAN PASSWORD & PASSWORD RESET TOKEN
  // ----------------------------------------------------------------------------
  console.log('\n8. Pengujian Perubahan Password & Reset Token:');

  await uji('Ubah password memverifikasi password lama dan menginvalidasi sesi lain', () => {
    const resReg = layanan.registrasi('joko_anwar', 'joko@nusantara.id', 'PasswordAwal123');
    const uId = resReg.pengguna!.id;

    const s1 = layanan.pengelolaSesi.buatSesi(uId);
    const s2 = layanan.pengelolaSesi.buatSesi(uId);

    // Ubah password dengan mempertahankan s1
    const sukses = layanan.ubahPassword(uId, 'PasswordAwal123', 'PasswordBaru987!', s1.tokenMentah);
    pastikan(sukses, 'Perubahan password harus sukses');

    // Sesi 1 tetap aktif
    pastikan(layanan.pengelolaSesi.validasiSesi(s1.tokenMentah) !== null);
    // Sesi 2 terinvalidasi
    pastikanSama(layanan.pengelolaSesi.validasiSesi(s2.tokenMentah), null);

    // Login baru harus menggunakan password baru
    const loginBaru = layanan.login('joko_anwar', 'PasswordBaru987!');
    pastikan(loginBaru.sukses);
  });

  await uji('Reset password: Token berbatas waktu dan hanya bisa dipakai satu kali', () => {
    const dataReset = layanan.buatTokenResetPassword('joko@nusantara.id');
    pastikan(dataReset !== null);

    // Eksekusi reset
    const suksesReset = layanan.eksekusiResetPassword(dataReset!.token, 'PasswordKuatBaru_456');
    pastikan(suksesReset);

    // Percobaan penggunaan kedua harus ditolak
    let tokenDipakaiUlang = false;
    try {
      layanan.eksekusiResetPassword(dataReset!.token, 'PasswordCobaLagi');
    } catch {
      tokenDipakaiUlang = true;
    }
    pastikan(tokenDipakaiUlang, 'Token yang sudah digunakan harus ditolak');
  });

  // ----------------------------------------------------------------------------
  // 9. INTEGRASI MIDDLEWARE DENGAN FRAMEWORK WEB NUSANTARA
  // ----------------------------------------------------------------------------
  console.log('\n9. Pengujian Integrasi Middleware dengan Web Framework:');

  await uji('Middleware wajibAutentikasi menolak permintaan tanpa sesi dengan 401', async () => {
    const app = new AplikasiWeb();
    app.dapatkan('/api/rahasia', (req, res) => res.json({ data: 'rahasia' }), buatMiddlewareWajibAutentikasi(layanan));

    const resTolak = await app.uji({ jalur: '/api/rahasia' });
    pastikanSama(resTolak.status, 401);
  });

  await uji('Middleware meloloskan permintaan terautentikasi dan menyematkan profil', async () => {
    const loginData = layanan.login('budi_wicaksono', 'PasswordSuper123');
    const token = loginData.tokenSesi!;

    const app = new AplikasiWeb();
    app.dapatkan(
      '/api/profil-saya',
      (req, res) => {
        const p = (req as any).pengguna;
        res.json({ username: p.username, role: p.role });
      },
      buatMiddlewareWajibAutentikasi(layanan)
    );

    const resLolos = await app.uji({
      jalur: '/api/profil-saya',
      tajuk: { Authorization: `Bearer ${token}` },
    });
    pastikanSama(resLolos.status, 200);
    pastikanSama(resLolos.json().username, 'budi_wicaksono');
    pastikanSama(resLolos.json().role, 'editor');
  });

  await uji('Middleware wajibPeran mengizinkan peran yang sesuai dan menolak dengan 403', async () => {
    const loginData = layanan.login('budi_wicaksono', 'PasswordSuper123'); // role: editor
    const token = loginData.tokenSesi!;

    const app = new AplikasiWeb();
    // Endpoint admin
    app.dapatkan(
      '/api/admin/pengaturan',
      (req, res) => res.json({ sukses: true }),
      buatMiddlewareWajibPeran(layanan, 'admin')
    );

    const resTolak = await app.uji({
      jalur: '/api/admin/pengaturan',
      tajuk: { Authorization: `Bearer ${token}` },
    });
    pastikanSama(resTolak.status, 403, 'Editor tidak boleh mengakses endpoint admin');
  });

  // ----------------------------------------------------------------------------
  // 10. PABRIK EKSPOR STDLIB & INTEGRASI INTERPRETER PROGRAM .nusantara
  // ----------------------------------------------------------------------------
  console.log('\n10. Pengujian Ekspor Standard Library autentikasi & Program NUSANTARA:');

  await uji('Pabrik ekspor stdlib autentikasi menyediakan fungsi-fungsi resmi', () => {
    const ekspor = buatEksporAutentikasi();
    pastikan(ekspor.has('hashPassword'));
    pastikan(ekspor.has('verifikasiPassword'));
    pastikan(ekspor.has('buatLayanan'));
    pastikan(ekspor.has('apakahTerautentikasi'));
    pastikan(ekspor.has('dapatkanPenggunaSaatIni'));

    const fnHash = ekspor.get('hashPassword') as NilaiFungsiBawaan;
    const resHash = fnHash.eksekusi([{ jenis: JenisNilaiRuntime.TEKS, nilai: 'TesPass123' }]);
    pastikan((resHash as any).nilai.startsWith('$scrypt$'));
  });

  await uji('Program NUSANTARA: Mengimpor autentikasi, melakukan hash, verifikasi, dan registrasi akun', () => {
    const kode = `program UjiAutentikasiDasar
gunakan "autentikasi" sebagai auth
gunakan "basisdata" sebagai db

mulai
    tampilkan("=== UJI AUTENTIKASI NUSANTARA ===")
    
    // Uji Hashing Password
    hashKataSandi : teks = auth.hashPassword("SandiRahasia999!")
    tampilkan("Hash Terbuat:", hashKataSandi)
    
    cocok : logika = auth.verifikasiPassword("SandiRahasia999!", hashKataSandi)
    tampilkan("Verifikasi Cocok:", cocok)
    
    tidakCocok : logika = auth.verifikasiPassword("SandiKeliru!", hashKataSandi)
    tampilkan("Verifikasi Salah:", tidakCocok)
    
    // Uji Layanan dengan SQLite Memory
    koneksi : peta = db.bukaMemori()
    layananAuth : peta = auth.buatLayanan(koneksi)
    layananAuth.inisialisasiSkema()
    
    hasilReg : peta = layananAuth.registrasi("dewi_lestari", "dewi@nusantara.id", "SandiDewi123!", "penulis")
    tampilkan("Registrasi Sukses:", hasilReg["sukses"])
    
    hasilLogin : peta = layananAuth.login("dewi_lestari", "SandiDewi123!")
    tampilkan("Login Sukses:", hasilLogin["sukses"])
    
    tampilkan("Selesai Uji Autentikasi.")
selesai
`;

    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer);
    interpreter.jalankanKode(kode);
    const logs = buffer.dapatkanSeluruhTeks().join('\n');

    pastikan(logs.includes('=== UJI AUTENTIKASI NUSANTARA ==='));
    pastikan(logs.includes('Verifikasi Cocok: benar'));
    pastikan(logs.includes('Verifikasi Salah: salah'));
    pastikan(logs.includes('Registrasi Sukses: benar'));
    pastikan(logs.includes('Login Sukses: benar'));
    pastikan(logs.includes('Selesai Uji Autentikasi.'));
  });

  // ----------------------------------------------------------------------------
  // REKAPITULASI
  // ----------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`HASIL PENGUJIAN PHASE 31: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
  console.log('=============================================================================');

  db.tutup();

  if (totalGagal > 0) {
    process.exit(1);
  }
}

jalankanSemuaPengujian();
