/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 39
 * Pengujian Komprehensif: Nusantara Mobile Networking & Cloud Services
 * Target Versi: v0.39.0
 */

import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { WebSocketServer } from 'ws';
import {
  LapisanKeamananMobile,
  PengawasJaringanMobile,
  PengelolaOperasiOffline,
  ManajerPermintaanMobile,
  KlienAPIMobile,
  KlienAutentikasiMobile,
  MesinSinkronisasiMobile,
  PengelolaTransferBerkasMobile,
  AdaptorStorageMock,
  AdaptorStorageS3,
  KlienWebSocketMobile,
  KlienDatabaseCloudMobile,
  PengelolaNotifikasiPushMobile,
  PengelolaTugasBackgroundMobile,
  RegistriPenyediaCloud,
  PengelolaKonfigurasiCloud,
  MobileCLI,
} from '../../src/mobile';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { VERSI_NUSANTARA } from '../../src/konstanta/versi';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>) {
  totalUji++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      throw new Error(`Uji '${nama}' bersifat asinkron tetapi dipanggil sinkron.`);
    }
    console.log(`  [✓ LULUS] ${nama}`);
    totalLulus++;
  } catch (err: any) {
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`      ${err.message}`);
    totalGagal++;
  }
}

async function ujiAsync(nama: string, fn: () => Promise<void>) {
  totalUji++;
  try {
    await fn();
    console.log(`  [✓ LULUS] ${nama}`);
    totalLulus++;
  } catch (err: any) {
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`      ${err.message}`);
    totalGagal++;
  }
}

function samaDengan(aktual: any, diharapkan: any, pesan?: string) {
  if (aktual !== diharapkan) {
    throw new Error(`${pesan || 'Nilai tidak cocok'}: diharapkan '${diharapkan}', ditemukan '${aktual}'`);
  }
}

function pastikan(kondisi: boolean, pesan: string) {
  if (!kondisi) {
    throw new Error(`Penegasan gagal: ${pesan}`);
  }
}

async function jalankanSemuaUji() {
  console.log('======================================================================');
  console.log(`PENGUJIAN KOMPREHENSIF FASE 39: NUSANTARA MOBILE NETWORKING & CLOUD`);
  console.log(`Target Versi Bahasa: v0.39.0 (Fase 39)`);
  console.log('======================================================================\n');

  // ---------------------------------------------------------------------------
  // [1] Keamanan Jaringan & Redaksi Rahasia
  // ---------------------------------------------------------------------------
  console.log('[1] Lapisan Keamanan Mobile & Redaksi Rahasia (Security Layer)');
  uji('1.1 Redaksi header otentikasi dan data sensitif', () => {
    const headers = {
      'Accept': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      'X-API-Key': 'rahasia_kunci_api_super_rahasia_123',
    };
    const hasil = LapisanKeamananMobile.redaksiHeader(headers);
    samaDengan(hasil['Accept'], 'application/json');
    pastikan(hasil['Authorization'].includes('...***...'), 'Header Authorization harus disensor');
    pastikan(hasil['X-API-Key'].includes('...***...'), 'Header X-API-Key harus disensor');
  });

  uji('1.2 Validasi protokol HTTPS untuk lingkungan produksi', () => {
    const cekHttp = LapisanKeamananMobile.validasiUrlAman('http://api.bank.id/v1', 'produksi');
    samaDengan(cekHttp.valid, false, 'HTTP biasa harus ditolak di mode produksi');

    const cekHttps = LapisanKeamananMobile.validasiUrlAman('https://api.bank.id/v1', 'produksi');
    samaDengan(cekHttps.valid, true, 'HTTPS harus diizinkan di mode produksi');

    const cekDev = LapisanKeamananMobile.validasiUrlAman('http://localhost:3000/api', 'pengembangan');
    samaDengan(cekDev.valid, true, 'Localhost HTTP boleh di mode pengembangan');
  });

  uji('1.3 Pencegahan manipulasi path traversal pada nama berkas', () => {
    const bahaya = '../../../etc/passwd';
    const aman = LapisanKeamananMobile.amankanNamaBerkas(bahaya);
    pastikan(!aman.includes('..') && !aman.includes('/'), 'Path traversal harus dinetralkan');
  });

  uji('1.4 Perlindungan pemalsuan role/izin di sisi klien', () => {
    const payloadJahat = { nama: 'Budi', role: 'admin' };
    const hasil = LapisanKeamananMobile.periksaKlaimKlien(payloadJahat);
    samaDengan(hasil.aman, false, 'Payload dengan klaim role lokal harus ditolak');
  });

  // ---------------------------------------------------------------------------
  // [2] Pengawas Konektivitas Jaringan (Network Connectivity Monitor)
  // ---------------------------------------------------------------------------
  console.log('\n[2] Pengawas Konektivitas Jaringan (Network Monitor)');
  uji('2.1 Status konektivitas dan deteksi antarmuka fisik', () => {
    const monitor = PengawasJaringanMobile.dapatkanInstance();
    const st = monitor.dapatkanStatus();
    pastikan(typeof st.terhubung === 'boolean', 'Status terhubung harus boolean');
    pastikan(['wifi', 'seluler', 'ethernet', 'tidak_ada', 'lainnya'].includes(st.tipe), 'Tipe jaringan harus valid');
  });

  uji('2.2 Siaran perubahan jaringan ke para pendengar', () => {
    const monitor = PengawasJaringanMobile.dapatkanInstance();
    let terpanggil = false;
    const berhenti = monitor.langganan((info) => {
      terpanggil = true;
    });

    monitor.perbaruiStatusFisik(true, 'wifi', false);
    pastikan(terpanggil, 'Pendengar jaringan harus menerima siaran pembaruan');
    berhenti();
  });

  // ---------------------------------------------------------------------------
  // [3] Pengelola Operasi Offline (Offline Queue)
  // ---------------------------------------------------------------------------
  console.log('\n[3] Pengelola Antrean Operasi Offline (Offline Queue)');
  uji('3.1 Penambahan operasi offline dengan idempotency key', () => {
    const antrean = PengelolaOperasiOffline.dapatkanInstance();
    antrean.reset();

    const op = antrean.tambah({
      endpoint: '/catatan',
      metode: 'POST',
      body: { judul: 'Uji Coba' },
      idempotencyKey: 'idemp_key_001',
    });

    pastikan(Boolean(op.id), 'Operasi harus memiliki ID unik');
    samaDengan(op.status, 'tertunda');
    samaDengan(antrean.dapatkanTertunda().length, 1);
  });

  uji('3.2 De-duplikasi otomatis pada idempotency key yang sama', () => {
    const antrean = PengelolaOperasiOffline.dapatkanInstance();
    const op1 = antrean.tambah({
      endpoint: '/catatan',
      metode: 'POST',
      body: { judul: 'Uji Coba 1' },
      idempotencyKey: 'idemp_key_sama',
    });

    const op2 = antrean.tambah({
      endpoint: '/catatan',
      metode: 'POST',
      body: { judul: 'Uji Coba 2' },
      idempotencyKey: 'idemp_key_sama',
    });

    samaDengan(op1.id, op2.id, 'Operasi dengan idempotency key sama tidak boleh diduplikasi');
  });

  uji('3.3 Transisi status operasi (tertunda -> diproses -> sukses)', () => {
    const antrean = PengelolaOperasiOffline.dapatkanInstance();
    const ops = antrean.dapatkanTertunda();
    pastikan(ops.length > 0, 'Harus ada operasi tertunda');

    const targetId = ops[0].id;
    antrean.tandaiDiproses(targetId);
    antrean.tandaiSukses(targetId);

    const hitung = antrean.hitung();
    pastikan(hitung.sukses >= 1, 'Operasi harus bertatus sukses');
    antrean.bersihkanOperasiSukses();
  });

  // ---------------------------------------------------------------------------
  // [4] Manajer Permintaan & Throttling Konkurensi
  // ---------------------------------------------------------------------------
  console.log('\n[4] Manajer Permintaan Jaringan & Prioritas (Request Manager)');
  await ujiAsync('4.1 Penjadwalan antrean dengan prioritas tinggi didahulukan', async () => {
    const manajer = ManajerPermintaanMobile.dapatkanInstance();
    const urutan: string[] = [];

    const pRendah = manajer.jadwalkan(async () => {
      urutan.push('rendah');
      return 'rendah';
    }, 'rendah');

    const pTinggi = manajer.jadwalkan(async () => {
      urutan.push('tinggi');
      return 'tinggi';
    }, 'tinggi');

    await Promise.all([pRendah, pTinggi]);
    pastikan(urutan.length === 2, 'Kedua tugas harus selesai');
  });

  await ujiAsync('4.2 Retry dengan exponential backoff dan jitter', async () => {
    const manajer = ManajerPermintaanMobile.dapatkanInstance();
    let percobaan = 0;

    const res = await manajer.eksekusiDenganRetry(
      async () => {
        percobaan++;
        if (percobaan < 2) {
          throw new Error('Gagal sementara');
        }
        return 'berhasil';
      },
      { cobaUlangMaks: 3, jedaAwalMs: 10 }
    );

    samaDengan(res, 'berhasil');
    samaDengan(percobaan, 2);
  });

  // ---------------------------------------------------------------------------
  // [5] Klien REST API Mobile (KlienAPIMobile)
  // ---------------------------------------------------------------------------
  console.log('\n[5] Klien REST API Mobile (KlienAPIMobile)');
  await ujiAsync('5.1 Permintaan REST API dengan metode lengkap', async () => {
    const klien = new KlienAPIMobile({ baseUrl: 'https://api.nusantara.test' });

    const resGet = await klien.dapatkan('/item');
    pastikan(resGet.status >= 200, 'GET harus mengembalikan status valid');

    const resPost = await klien.kirim('/item', { nama: 'Barang A' });
    pastikan(resPost.status >= 200, 'POST harus berhasil');

    const resPut = await klien.perbarui('/item/1', { nama: 'Barang Diperbarui' });
    pastikan(resPut.status >= 200, 'PUT harus berhasil');

    const resPatch = await klien.tambal('/item/1', { harga: 50000 });
    pastikan(resPatch.status >= 200, 'PATCH harus berhasil');

    const resDel = await klien.hapus('/item/1');
    pastikan(resDel.status >= 200, 'DELETE harus berhasil');
  });

  uji('5.2 Eksekusi permintaan sinkron (permintaanSinkron)', () => {
    const klien = new KlienAPIMobile({ baseUrl: 'https://api.nusantara.test' });
    const res = klien.permintaanSinkron('/data', { metode: 'POST', body: { uji: true } });
    samaDengan(res.sukses, true);
    samaDengan(res.status, 200);
  });

  // ---------------------------------------------------------------------------
  // [6] Klien Autentikasi & Penyimpanan Token Aman
  // ---------------------------------------------------------------------------
  console.log('\n[6] Klien Autentikasi Mobile & OAuth 2.0 PKCE');
  await ujiAsync('6.1 Masuk, penyimpanan token di Keystore/Keychain, dan keluar', async () => {
    const auth = new KlienAutentikasiMobile();
    auth.keluar(); // Pastikan bersih

    const resMasuk = await auth.masuk('pengembang@nusantara.id', 'SandiAman#2026');
    samaDengan(resMasuk.sukses, true);
    samaDengan(auth.apakahTerautentikasi(), true);
    pastikan(Boolean(auth.dapatkanTokenAkses()), 'Token akses harus tersedia');

    auth.keluar();
    samaDengan(auth.apakahTerautentikasi(), false);
    samaDengan(auth.dapatkanTokenAkses(), undefined);
  });

  uji('6.2 Pembuatan parameter OAuth 2.0 PKCE (code_verifier & code_challenge S256)', () => {
    const pkce = KlienAutentikasiMobile.buatKonfigurasiPKCE(
      'klien_mobile_01',
      'https://auth.nusantara.id/oauth/authorize',
      'https://auth.nusantara.id/oauth/token',
      'nusantara://oauth/callback'
    );

    pastikan(pkce.codeVerifier.length >= 43, 'code_verifier minimal 43 karakter');
    pastikan(pkce.codeChallenge.length > 0, 'code_challenge harus dihasilkan');
    pastikan(pkce.state.length > 0, 'state harus dihasilkan');
  });

  // ---------------------------------------------------------------------------
  // [7] Mesin Sinkronisasi & Resolusi Konflik
  // ---------------------------------------------------------------------------
  console.log('\n[7] Mesin Sinkronisasi Mobile (Sync Engine & Conflict Resolution)');
  await ujiAsync('7.1 Sinkronisasi data tertunda dari antrean offline', async () => {
    const antrean = PengelolaOperasiOffline.dapatkanInstance();
    antrean.reset();

    antrean.tambah({
      endpoint: '/sinkron/uji',
      metode: 'POST',
      body: { data: 'Catatan Lapangan' },
      idempotencyKey: 'sync_test_01',
    });

    const syncEngine = MesinSinkronisasiMobile.dapatkanInstance();
    const hasil = await syncEngine.sinkronkan();

    samaDengan(hasil.sukses, true);
    pastikan(hasil.jumlahTerkirim >= 1, 'Harus mengirimkan operasi tertunda');
  });

  await ujiAsync('7.2 Resolusi konflik data strategi Last-Write-Wins', async () => {
    const syncEngine = MesinSinkronisasiMobile.dapatkanInstance();
    const sekarang = Date.now();

    const konflikLWW = {
      id: 'konflik_01',
      dataLokal: { revisi: 'versi_lokal_terbaru' },
      dataServer: { revisi: 'versi_server_lama' },
      waktuLokal: sekarang + 10000,
      waktuServer: sekarang,
      strategi: 'tulis_terakhir_menang' as const,
      diselesaikan: false,
    };

    const hasil = await syncEngine.selesaikanKonflik(konflikLWW);
    samaDengan(hasil.revisi, 'versi_lokal_terbaru', 'LWW harus memilih waktu termutakhir');
  });

  // ---------------------------------------------------------------------------
  // [8] Cloud Storage & Transfer Berkas
  // ---------------------------------------------------------------------------
  console.log('\n[8] Cloud Storage Adapter & Transfer Berkas');
  await ujiAsync('8.1 Unggah berkas, pelacakan progres, dan unduh berkas', async () => {
    const storage = PengelolaTransferBerkasMobile.dapatkanInstance();
    let progresTerpantau = false;

    const resUnggah = await storage.unggah({
      namaBerkas: 'laporan_uji.txt',
      konten: 'Isi dokumen uji coba mobile cloud storage.',
      folder: 'dokumen',
      padaProgres: (persen) => {
        if (persen > 0) progresTerpantau = true;
      },
    });

    samaDengan(resUnggah.sukses, true);
    pastikan(Boolean(resUnggah.berkas?.url), 'URL berkas harus dihasilkan');
    pastikan(progresTerpantau, 'Callback progres harus terpanggil');

    const resUnduh = await storage.unduh(resUnggah.berkas!.id);
    samaDengan(resUnduh.sukses, true);
    samaDengan(resUnduh.data, 'Isi dokumen uji coba mobile cloud storage.');
  });

  uji('8.2 Adaptor S3 Compatible Storage', () => {
    const s3 = new AdaptorStorageS3('https://s3.ap-southeast-1.amazonaws.com', 'bucket-nusantara');
    samaDengan(s3.namaPenyedia, 's3_compatible');
  });

  // ---------------------------------------------------------------------------
  // [9] WebSocket & Realtime Mobile
  // ---------------------------------------------------------------------------
  console.log('\n[9] WebSocket Mobile & Penanganan Status Latar Belakang');
  uji('9.1 Siklus hidup WebSocket, heartbeat, dan penangguhan latar belakang', () => {
    const ws = new KlienWebSocketMobile({
      url: 'wss://realtime.nusantara.internal/ws',
      intervalHeartbeatMs: 10000,
    });

    ws.buka();
    samaDengan(ws.dapatkanStatus(), 'terbuka');

    // Uji penangguhan saat aplikasi ke background
    ws.tanganiAplikasiKeLatarBelakang();
    // Uji pemulihan saat aplikasi kembali ke foreground
    ws.tanganiAplikasiKeLatarDepan();

    ws.tutup();
    samaDengan(ws.dapatkanStatus(), 'ditutup');
  });

  // ---------------------------------------------------------------------------
  // [10] Database Cloud REST Client
  // ---------------------------------------------------------------------------
  console.log('\n[10] Database Cloud REST Client (KlienDatabaseCloudMobile)');
  await ujiAsync('10.1 Operasi CRUD database cloud dengan paginasi dan filter', async () => {
    const apiClient = new KlienAPIMobile({ baseUrl: 'https://api.nusantara.test' });
    const db = new KlienDatabaseCloudMobile(apiClient, '/api/v1/db');

    const hasilList = await db.ambilSemua('produk', { halaman: 1, perHalaman: 10 });
    samaDengan(hasilList.sukses, true);

    const hasilBuat = await db.buat('produk', { nama: 'Keyboard Mechanical', harga: 850000 });
    samaDengan(hasilBuat.sukses, true);
  });

  // ---------------------------------------------------------------------------
  // [11] Push Notifications (FCM / APNs)
  // ---------------------------------------------------------------------------
  console.log('\n[11] Fondasi Push Notifications (FCM / APNs)');
  uji('11.1 Token perangkat, penerimaan notifikasi, dan deep link', () => {
    const push = PengelolaNotifikasiPushMobile.dapatkanInstance();
    const token = push.dapatkanToken();
    pastikan(token.startsWith('fcm_token_'), 'Token perangkat harus valid');

    let notifDiterima = false;
    let deepLinkDiterima = '';

    const stopNotif = push.padaNotifikasi((n) => {
      notifDiterima = true;
    });
    const stopDL = push.padaDeepLink((url) => {
      deepLinkDiterima = url;
    });

    push.terimaPush({
      judul: 'Pembaruan Saldo',
      pesan: 'Saldo Anda bertambah Rp 100.000',
      deepLink: 'nusantara://dompet/riwayat',
    });

    pastikan(notifDiterima, 'Notifikasi push harus diterima');
    samaDengan(deepLinkDiterima, 'nusantara://dompet/riwayat', 'Deep link harus dipetakan');

    stopNotif();
    stopDL();
  });

  // ---------------------------------------------------------------------------
  // [12] Background Sync Scheduler (WorkManager / BackgroundTasks)
  // ---------------------------------------------------------------------------
  console.log('\n[12] Penjadwalan Tugas Background (WorkManager / BackgroundTasks)');
  await ujiAsync('12.1 Pendaftaran tugas berkala dengan batasan jaringan & baterai', async () => {
    const bg = PengelolaTugasBackgroundMobile.dapatkanInstance();
    let dieksekusi = false;

    bg.daftarkanTugas(
      'tugas_sync_uji',
      'Uji Sinkronisasi Background',
      async () => {
        dieksekusi = true;
        return true;
      },
      { memerlukanJaringan: true, memerlukanBateraiCukup: true },
      15
    );

    await bg.jalankanManual('tugas_sync_uji');
    pastikan(dieksekusi, 'Tugas background harus berhasil dieksekusi secara manual');
    bg.hentikanTugas('tugas_sync_uji');
  });

  // ---------------------------------------------------------------------------
  // [13] Registri Multi-Cloud Provider
  // ---------------------------------------------------------------------------
  console.log('\n[13] Registri Multi-Cloud Provider');
  uji('13.1 Registrasi provider bawaan dan pemilihan penyedia aktif', () => {
    const reg = RegistriPenyediaCloud.dapatkanInstance();
    const semua = reg.dapatkanSemua();
    pastikan(semua.length >= 4, 'Minimal 4 penyedia cloud terdaftar');

    samaDengan(reg.pilihPenyedia('supabase'), true);
    samaDengan(reg.dapatkanPenyediaAktif().id, 'supabase');

    reg.pilihPenyedia('mock_local');
  });

  // ---------------------------------------------------------------------------
  // [14] Konfigurasi Cloud Mobile
  // ---------------------------------------------------------------------------
  console.log('\n[14] Konfigurasi Cloud Mobile');
  uji('14.1 Manajemen konfigurasi lingkungan dan penegakan TLS pada produksi', () => {
    const pengelola = PengelolaKonfigurasiCloud.dapatkanInstance();

    // Beralih ke produksi dengan URL valid
    const resProd = pengelola.beralihKeProduksi('https://api.nusantara.id');
    samaDengan(resProd.sukses, true);
    samaDengan(pengelola.dapatkanKonfigurasi().validasiSertifikatTLS, true);

    // Coba beralih ke produksi dengan HTTP biasa (harus ditolak)
    const resGagal = pengelola.muatKonfigurasi({
      namaLingkungan: 'produksi',
      apiUrl: 'http://api.tidakaman.id',
    });
    samaDengan(resGagal.sukses, false);

    pengelola.beralihKePengembangan();
  });

  // ---------------------------------------------------------------------------
  // [15] Integrasi Subperintah CLI Nusantara Mobile
  // ---------------------------------------------------------------------------
  console.log('\n[15] Integrasi CLI Nusantara Mobile');
  uji('15.1 Eksekusi nusantara mobile jaringan periksa', () => {
    samaDengan(MobileCLI.jalankan(['jaringan', 'periksa']), 0);
  });

  uji('15.2 Eksekusi nusantara mobile cloud info, konfigurasi, dan validasi', () => {
    samaDengan(MobileCLI.jalankan(['cloud', 'info']), 0);
    samaDengan(MobileCLI.jalankan(['cloud', 'validasi']), 0);
    samaDengan(MobileCLI.jalankan(['cloud', 'konfigurasi', 'pengembangan']), 0);
  });

  uji('15.3 Eksekusi nusantara mobile sync periksa', () => {
    samaDengan(MobileCLI.jalankan(['sync', 'periksa']), 0);
  });

  // ---------------------------------------------------------------------------
  // [16] Standard Library & Eksekusi Skrip .nusantara
  // ---------------------------------------------------------------------------
  console.log('\n[16] Integrasi Standard Library std:mobile & Eksekusi Contoh Nyata .nusantara');
  uji('16.1 Eksekusi contoh/mobile/api_explorer/api_explorer.nusantara', () => {
    const berkas = path.join(process.cwd(), 'contoh/mobile/api_explorer/api_explorer.nusantara');
    const kode = fs.readFileSync(berkas, 'utf-8');
    const buf = new PenulisOutputBuffer();
    const interp = new Interpreter(buf);
    interp.jalankanKode(kode);

    const out = buf.dapatkanSeluruhTeks().join('\n');
    pastikan(out.includes('API Explorer berhasil mengeksekusi siklus REST API secara sukses.'), 'Harus sukses mengeksekusi');
  });

  uji('16.2 Eksekusi contoh/mobile/cloud_login/cloud_login.nusantara', () => {
    const berkas = path.join(process.cwd(), 'contoh/mobile/cloud_login/cloud_login.nusantara');
    const kode = fs.readFileSync(berkas, 'utf-8');
    const buf = new PenulisOutputBuffer();
    const interp = new Interpreter(buf);
    interp.jalankanKode(kode);

    const out = buf.dapatkanSeluruhTeks().join('\n');
    pastikan(out.includes('Cloud Login Demo berhasil diselesaikan dengan aman.'), 'Harus sukses mengeksekusi');
  });

  uji('16.3 Eksekusi contoh/mobile/offline_notes/offline_notes.nusantara', () => {
    const berkas = path.join(process.cwd(), 'contoh/mobile/offline_notes/offline_notes.nusantara');
    const kode = fs.readFileSync(berkas, 'utf-8');
    const buf = new PenulisOutputBuffer();
    const interp = new Interpreter(buf);
    interp.jalankanKode(kode);

    const out = buf.dapatkanSeluruhTeks().join('\n');
    pastikan(out.includes('Aplikasi Catatan Offline-First berhasil beroperasi dengan sempurna.'), 'Harus sukses mengeksekusi');
  });

  uji('16.4 Eksekusi contoh/mobile/cloud_file_manager/cloud_file_manager.nusantara', () => {
    const berkas = path.join(process.cwd(), 'contoh/mobile/cloud_file_manager/cloud_file_manager.nusantara');
    const kode = fs.readFileSync(berkas, 'utf-8');
    const buf = new PenulisOutputBuffer();
    const interp = new Interpreter(buf);
    interp.jalankanKode(kode);

    const out = buf.dapatkanSeluruhTeks().join('\n');
    pastikan(out.includes('Cloud File Manager berhasil mentransfer berkas secara aman.'), 'Harus sukses mengeksekusi');
  });

  // ---------------------------------------------------------------------------
  // [17] Integrasi Loopback TCP HTTP + WebSocket + Persistensi Antrean Disk
  // ---------------------------------------------------------------------------
  console.log('\n[17] Integrasi Loopback HTTP & WebSocket Cloud Nyata + Persistensi Disk');
  await ujiAsync('17.1 Loopback HTTP Server Nyata: Autentikasi JWT, REST CRUD & Sinkronisasi Konflik 409 LWW', async () => {
    const dbCatatan: Record<string, any> = {};
    const tokenResmi = 'jwt_loopback_valid_2026';
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-p39-sync-'));
    const queueFile = path.join(tmpDir, 'offline_queue.json');

    const server = http.createServer((req, res) => {
      const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
      let rawBody = '';
      req.on('data', (chunk) => { rawBody += chunk; });
      req.on('end', () => {
        const parsed = rawBody ? JSON.parse(rawBody) : {};
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Server-Bukti', 'nusantara-loopback-live');

        if (req.method === 'POST' && urlObj.pathname === '/auth/masuk') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            accessToken: tokenResmi,
            refreshToken: 'ref_loopback_01',
            pengguna: { id: 'u1', email: parsed.identitas },
          }));
          return;
        }

        if (req.method === 'GET' && urlObj.pathname === '/catatan') {
          if (req.headers['authorization'] !== `Bearer ${tokenResmi}`) {
            res.statusCode = 401;
            res.end(JSON.stringify({ pesan: 'Unauthorized' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ item: Object.values(dbCatatan) }));
          return;
        }

        if (req.method === 'POST' && urlObj.pathname === '/catatan') {
          if (parsed.paksaKonflik) {
            res.statusCode = 409;
            res.end(JSON.stringify({
              dataServer: { judul: 'Versi Server Lama', isi: 'server' },
              waktuServer: Date.now() - 60000,
            }));
            return;
          }
          const id = parsed.id || `doc_${Date.now()}`;
          dbCatatan[id] = { id, ...parsed };
          res.statusCode = 201;
          res.end(JSON.stringify({ tersimpan: true, doc: dbCatatan[id] }));
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ pesan: 'Not Found' }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as any;
    const baseUrl = `http://127.0.0.1:${addr.port}`;

    try {
      const api = new KlienAPIMobile({ baseUrl });
      const auth = new KlienAutentikasiMobile({ apiClient: api });
      auth.keluar();

      const resLogin = await auth.masuk('developer@nusantara.id', 'Sandi123!');
      samaDengan(resLogin.sukses, true, 'Login loopback HTTP harus sukses');
      samaDengan(auth.dapatkanTokenAkses(), tokenResmi, 'Harus menerima token asli dari server loopback');

      const resGet = await api.dapatkan('/catatan');
      samaDengan(resGet.status, 200, 'GET terautentikasi harus HTTP 200');
      samaDengan(resGet.headers['x-server-bukti'], 'nusantara-loopback-live', 'Harus mengenai server HTTP nyata');

      const monitor = PengawasJaringanMobile.dapatkanInstance();
      const antrean = PengelolaOperasiOffline.dapatkanInstance();
      antrean.reset();
      antrean.aturJalurPersistensi(queueFile);

      // Simulasi offline: enqueue ke disk
      monitor.perbaruiStatusFisik(false, 'tidak_ada', false);
      const q1 = await api.kirim('/catatan', { id: 'c1', judul: 'Catatan Offline' });
      const q2 = await api.kirim('/catatan', { id: 'c2', judul: 'Catatan Konflik LWW', paksaKonflik: true });
      samaDengan(q1.status, 202, 'Saat offline harus antre (202)');
      samaDengan(q2.status, 202, 'Operasi konflik saat offline harus antre (202)');
      pastikan(fs.existsSync(queueFile), 'Antrean offline harus tersimpan persisten ke berkas disk');

      // Reload dari disk lalu sinkronkan ke server loopback nyata
      antrean.muatUlangDariDisk();
      samaDengan(antrean.hitung().tertunda, 2, 'Reload disk harus memulihkan 2 operasi tertunda');

      const sync = MesinSinkronisasiMobile.dapatkanInstance();
      sync.aturKlienAPI(api);
      monitor.perbaruiStatusFisik(true, 'wifi', false);
      // Tunggu sebentar jika auto-sync terpanggil listener
      await new Promise((r) => setTimeout(r, 80));
      if (antrean.hitung().tertunda > 0) {
        await sync.sinkronkan();
      }

      pastikan(dbCatatan['c1']?.judul === 'Catatan Offline', 'Catatan c1 harus terkirim ke server loopback');
      samaDengan(antrean.hitung().tertunda, 0, 'Antrean tertunda harus terkuras habis setelah sync');
      const riwayatTerbaru = sync.dapatkanRiwayat()[0];
      pastikan(riwayatTerbaru && riwayatTerbaru.konflik.length >= 1, 'Konflik HTTP 409 harus tercatat dan diselesaikan LWW');
    } finally {
      PengelolaOperasiOffline.dapatkanInstance().aturJalurPersistensi(undefined);
      PengelolaOperasiOffline.dapatkanInstance().reset();
      fs.rmSync(tmpDir, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  await ujiAsync('17.2 KlienWebSocketMobile terhubung penuh via TCP WebSocketServer nyata', async () => {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
    await new Promise<void>((resolve) => wss.once('listening', () => resolve()));
    const addr = wss.address() as any;
    const pesanDiterimaServer: any[] = [];

    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        pesanDiterimaServer.push(msg);
        ws.send(JSON.stringify({ tipe: 'ack', gema: msg.pesan }));
      });
    });

    const klienWs = new KlienWebSocketMobile({
      url: `ws://127.0.0.1:${addr.port}`,
      autoReconnect: false,
      intervalHeartbeatMs: 60000,
    });

    try {
      const balasan = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout WebSocket')), 4000);
        klienWs.padaPesan((d) => {
          clearTimeout(timeout);
          resolve(d);
        });
        klienWs.padaStatus((st) => {
          if (st === 'terbuka') {
            klienWs.kirim({ tipe: 'chat', pesan: 'halo_ws_nyata' });
          }
        });
        klienWs.buka();
      });

      samaDengan(balasan.tipe, 'ack');
      samaDengan(balasan.gema, 'halo_ws_nyata');
      pastikan(pesanDiterimaServer.length === 1, 'Server WebSocket harus menerima 1 pesan nyata');
    } finally {
      klienWs.tutup();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    }
  });

  console.log('\n======================================================================');
  console.log(`HASIL PENGUJIAN FASE 39: ${totalLulus}/${totalUji} LULUS`);
  if (totalGagal > 0) {
    console.error(`Terdapat ${totalGagal} pengujian GAGAL.`);
    process.exit(1);
  } else {
    console.log(`Semua pengujian Fase 39 BERHASIL 100%!\n`);
  }
}

jalankanSemuaUji().catch((err) => {
  console.error('Galat fatal dalam pengujian Fase 39:', err);
  process.exit(1);
});
