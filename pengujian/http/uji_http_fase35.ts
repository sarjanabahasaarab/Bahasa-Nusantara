/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 35 Test Suite
 * Pengujian Komprehensif HTTP Client, API Integration & External Services
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  KlienHTTP,
  KlienAPI,
  PengunduhBerkas,
  PengunggahBerkas,
  PengelolaWebhook,
  AdaptorLayananEmail,
  AdaptorLayananCuaca,
  PetaHeaderHTTP,
  PengelolaAutentikasiHTTP,
  PenyimpanCookieMemori,
  KebijakanCobaUlangHTTP,
  GalatHTTP,
  GalatJaringanHTTP,
  GalatTimeoutHTTP,
  buatTugasHTTP,
} from '../../src/http';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';

let lulusSemua = true;
let totalTes = 0;
let tesBerhasil = 0;

function uji(nama: string, fn: () => void | Promise<void>): Promise<void> {
  totalTes++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      tesBerhasil++;
      console.log(`  \x1b[32m✓\x1b[0m [LULUS] ${nama}`);
    })
    .catch((err) => {
      lulusSemua = false;
      console.error(`  \x1b[31m✗\x1b[0m [GAGAL] ${nama}`);
      console.error(`    Alasan: ${err.message || err}`);
    });
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('PENGUJIAN SISTEM HTTP CLIENT & API INTEGRATION (PHASE 35)');
  console.log('Target Versi: v0.35.0');
  console.log('='.repeat(70));

  // 1. Siapkan Mock Server HTTP Lokal
  let flakyCount = 0;
  const mockServer = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Route: /ping
    if (pathname === '/ping' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pesan: 'pong' }));
      return;
    }

    // Route: /echo
    if (pathname === '/echo' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          metode: req.method,
          header: req.headers,
          tubuh: body ? JSON.parse(body) : null,
        }));
      });
      return;
    }

    // Route: /metode (PUT, PATCH, DELETE, HEAD, OPTIONS)
    if (pathname === '/metode') {
      if (req.method === 'DELETE') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'X-Kustom-Head': 'Ada' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ metode: req.method, diterima: true }));
      return;
    }

    // Route: /auth/basic
    if (pathname === '/auth/basic') {
      const auth = req.headers['authorization'];
      if (auth === 'Basic dXNlcjpwYXNz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ terotentikasi: true, jenis: 'basic' }));
      } else {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic' });
        res.end(JSON.stringify({ error: 'Tidak sah' }));
      }
      return;
    }

    // Route: /auth/bearer
    if (pathname === '/auth/bearer') {
      const auth = req.headers['authorization'];
      if (auth === 'Bearer token-rahasia-123') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ terotentikasi: true, jenis: 'bearer' }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Token salah' }));
      }
      return;
    }

    // Route: /auth/apikey
    if (pathname === '/auth/apikey') {
      const headerKey = req.headers['x-api-key'];
      const queryKey = parsedUrl.searchParams.get('api_key');
      if (headerKey === 'kunci-rahasia' || queryKey === 'kunci-rahasia') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ terotentikasi: true, jenis: 'apikey' }));
      } else {
        res.writeHead(403);
        res.end(JSON.stringify({ error: 'API key tidak valid' }));
      }
      return;
    }

    // Route: /cookie/set
    if (pathname === '/cookie/set') {
      res.writeHead(200, {
        'Set-Cookie': ['sesi=nusantara_123; Path=/; HttpOnly', 'tema=gelap; Path=/'],
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({ status: 'cookie_ditetapkan' }));
      return;
    }

    // Route: /cookie/check
    if (pathname === '/cookie/check') {
      const cookieHeader = req.headers['cookie'] || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ cookie: cookieHeader }));
      return;
    }

    // Route: /redirect/start -> /redirect/target
    if (pathname === '/redirect/start') {
      res.writeHead(302, { 'Location': '/redirect/target' });
      res.end();
      return;
    }
    if (pathname === '/redirect/target') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pengalihanBerhasil: true }));
      return;
    }

    // Route: /redirect/loop
    if (pathname === '/redirect/loop1') {
      res.writeHead(302, { 'Location': '/redirect/loop2' });
      res.end();
      return;
    }
    if (pathname === '/redirect/loop2') {
      res.writeHead(302, { 'Location': '/redirect/loop1' });
      res.end();
      return;
    }

    // Route: /flaky (503 then 200)
    if (pathname === '/flaky') {
      flakyCount++;
      if (flakyCount < 3) {
        res.writeHead(503, { 'Retry-After': '0' });
        res.end('Layanan Sementara Sibuk');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ suksesSetelahCobaUlang: true, percobaan: flakyCount }));
      }
      return;
    }

    // Route: /unduh/berkas.txt
    if (pathname === '/unduh/berkas.txt') {
      const isi = 'Konten berkas uji coba unduhan Nusantara HTTP Client Phase 35.';
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(isi).toString(),
        'Content-Disposition': 'attachment; filename="uji_unduh.txt"'
      });
      res.end(isi);
      return;
    }

    // Route: /unggah
    if (pathname === '/unggah' && req.method === 'POST') {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          terimaByte: data.length,
          berisiFile: data.includes('name="dokumen"'),
        }));
      });
      return;
    }

    // Route: /api/pengguna (pagination)
    if (pathname === '/api/pengguna') {
      const page = parseInt(parsedUrl.searchParams.get('page') || '1', 10);
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '2', 10);
      const total = 5;
      const semuaData = [
        { id: 1, nama: 'Budi' },
        { id: 2, nama: 'Siti' },
        { id: 3, nama: 'Andi' },
        { id: 4, nama: 'Dewi' },
        { id: 5, nama: 'Eko' },
      ];
      const start = (page - 1) * limit;
      const items = semuaData.slice(start, start + limit);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        page,
        limit,
        total,
        items,
        habis: start + limit >= total,
      }));
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(0, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = mockServer.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const tempDir = path.resolve('./temp_uji_http');

  try {
    // ------------------------------------------------------------------------
    // KELOMPOK 1: HeaderMap & Keamanan Injeksi Header
    // ------------------------------------------------------------------------
    console.log('--- Kelompok 1: PetaHeaderHTTP & Keamanan Header ---');

    await uji('PetaHeaderHTTP case-insensitive dan multi-value', () => {
      const h = new PetaHeaderHTTP({
        'Content-Type': 'application/json',
        'X-Trace-ID': 'trace-1',
      });
      pastikan(h.dapatkan('content-type') === 'application/json', 'Header case insensitive gagal');
      pastikan(h.dapatkan('CONTENT-TYPE') === 'application/json', 'Header uppercase gagal');
      pastikan(h.memiliki('x-trace-id'), 'memiliki() gagal');

      h.tambah('Set-Cookie', 'a=1');
      h.tambah('Set-Cookie', 'b=2');
      const cookies = h.dapatkanSemua('set-cookie');
      pastikan(cookies.length === 2 && cookies[0] === 'a=1' && cookies[1] === 'b=2', 'tambah() multi-value gagal');
    });

    await uji('Pencegahan Header Injection (CRLF)', () => {
      const h = new PetaHeaderHTTP();
      let tertangkap = false;
      try {
        h.tetapkan('X-Bad-Header', 'val\r\nInjected-Header: evil');
      } catch (err: any) {
        tertangkap = true;
        pastikan(err instanceof GalatHTTP, 'Harus melempar GalatHTTP');
      }
      pastikan(tertangkap, 'CRLF injection pada nilai header harus ditolak');

      tertangkap = false;
      try {
        h.tetapkan('X-Bad\r\nHeader', 'val');
      } catch (err: any) {
        tertangkap = true;
      }
      pastikan(tertangkap, 'CRLF injection pada kunci header harus ditolak');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 2: KlienHTTP Permintaan & Metode Dasar
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 2: KlienHTTP Metode & Respon ---');

    const klien = new KlienHTTP({ batasWaktuMs: 5000 });

    await uji('KlienHTTP GET /ping', async () => {
      const res = await klien.get(`${baseUrl}/ping`);
      pastikan(res.status === 200, `Status harus 200, diterima ${res.status}`);
      pastikan(res.berhasil, 'res.berhasil harus bernilai true');
      const data = res.json<{ pesan: string }>();
      pastikan(data.pesan === 'pong', `Data pesan salah: ${data.pesan}`);
      pastikan(res.durasiMs >= 0, 'Durasi ms harus terisi');
    });

    await uji('KlienHTTP POST JSON /echo', async () => {
      const payload = { nama: 'Nusantara', fitur: 'HTTP Client', versi: 35 };
      const res = await klien.post(`${baseUrl}/echo`, payload, {
        headers: { 'X-Custom-Client': 'Uji-35' }
      });
      pastikan(res.status === 200, 'Status POST harus 200');
      const hasil = res.json<any>();
      pastikan(hasil.metode === 'POST', 'Metode harus POST');
      pastikan(hasil.tubuh.nama === 'Nusantara', 'Tubuh JSON tidak cocok');
      pastikan(hasil.header['x-custom-client'] === 'Uji-35', 'Header kustom tidak terkirim');
    });

    await uji('KlienHTTP PUT, PATCH, DELETE, HEAD', async () => {
      const resPut = await klien.put(`${baseUrl}/metode`, { aksi: 'update' });
      pastikan(resPut.status === 200 && resPut.json<any>().metode === 'PUT', 'PUT gagal');

      const resPatch = await klien.patch(`${baseUrl}/metode`, { aksi: 'patch' });
      pastikan(resPatch.status === 200 && resPatch.json<any>().metode === 'PATCH', 'PATCH gagal');

      const resDel = await klien.delete(`${baseUrl}/metode`);
      pastikan(resDel.status === 204, 'DELETE harus menghasilkan 204');

      const resHead = await klien.head(`${baseUrl}/metode`);
      pastikan(resHead.status === 200, 'HEAD harus menghasilkan 200');
      pastikan(resHead.header.dapatkan('x-kustom-head') === 'Ada', 'Header HEAD tidak ditemukan');
    });

    await uji('Fluent Request Builder PembangunRequest', async () => {
      const res = await klien.permintaan()
        .ke(`${baseUrl}/echo`)
        .metode('POST')
        .query('q', 'uji')
        .query('halaman', 2)
        .header('X-Builder', 'aktif')
        .json({ builtWith: 'fluent' })
        .kirim();

      pastikan(res.status === 200, 'Fluent request gagal');
      const data = res.json<any>();
      pastikan(data.header['x-builder'] === 'aktif', 'Header builder hilang');
      pastikan(data.tubuh.builtWith === 'fluent', 'Payload builder tidak cocok');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 3: Autentikasi (Basic, Bearer, API Key)
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 3: Autentikasi Klien ---');

    await uji('Autentikasi Basic HTTP', async () => {
      const resGagal = await klien.get(`${baseUrl}/auth/basic`);
      pastikan(resGagal.status === 401, 'Tanpa otentikasi harus 401');

      const klienBasic = new KlienHTTP({
        autentikasi: PengelolaAutentikasiHTTP.buatBasic('user', 'pass'),
      });
      const resSukses = await klienBasic.get(`${baseUrl}/auth/basic`);
      pastikan(resSukses.status === 200, 'Basic auth sah harus 200');
      pastikan(resSukses.json<any>().terotentikasi === true, 'Data auth basic tidak cocok');
    });

    await uji('Autentikasi Bearer Token', async () => {
      const klienBearer = new KlienHTTP({
        autentikasi: PengelolaAutentikasiHTTP.buatBearer('token-rahasia-123'),
      });
      const res = await klienBearer.get(`${baseUrl}/auth/bearer`);
      pastikan(res.status === 200, 'Bearer auth sah harus 200');
      pastikan(res.json<any>().jenis === 'bearer', 'Data bearer tidak cocok');
    });

    await uji('Autentikasi API Key via Header & Query', async () => {
      // Via Header
      const klienKeyHeader = new KlienHTTP({
        autentikasi: PengelolaAutentikasiHTTP.buatApiKey('X-API-Key', 'kunci-rahasia'),
      });
      const resH = await klienKeyHeader.get(`${baseUrl}/auth/apikey`);
      pastikan(resH.status === 200, 'API key header harus 200');

      // Via Query
      const klienKeyQuery = new KlienHTTP({
        autentikasi: PengelolaAutentikasiHTTP.buatApiKey('api_key', 'kunci-rahasia', 'query'),
      });
      const resQ = await klienKeyQuery.get(`${baseUrl}/auth/apikey`);
      pastikan(resQ.status === 200, 'API key query harus 200');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 4: Cookie Jar & Manajemen Sesi
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 4: Manajemen Cookie Jar ---');

    await uji('Cookie Jar in-memory Set-Cookie dan pengiriman Cookie', async () => {
      const klienCookie = new KlienHTTP();
      const resSet = await klienCookie.get(`${baseUrl}/cookie/set`);
      pastikan(resSet.status === 200, 'Set cookie harus 200');

      const cookiesTersimpan = klienCookie.dapatkanCookieJar().dapatkanCookieString(baseUrl);
      pastikan(cookiesTersimpan.includes('sesi=nusantara_123'), 'Cookie sesi harus tersimpan');
      pastikan(cookiesTersimpan.includes('tema=gelap'), 'Cookie tema harus tersimpan');

      // Request kedua harus menyertakan cookie
      const resCheck = await klienCookie.get(`${baseUrl}/cookie/check`);
      const dataCheck = resCheck.json<any>();
      pastikan(dataCheck.cookie.includes('sesi=nusantara_123'), 'Cookie sesi harus terkirim ke server');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 5: Pengalihan & Deteksi Loop
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 5: Pengalihan (Redirect) ---');

    await uji('Penanganan Pengalihan 302 Otomatis', async () => {
      const res = await klien.get(`${baseUrl}/redirect/start`);
      pastikan(res.status === 200, 'Hasil redirect harus 200');
      pastikan(res.json<any>().pengalihanBerhasil === true, 'Tiba di tujuan redirect');
      pastikan(res.pengalihan.length === 1, 'Harus mencatat 1 kali redirect');
    });

    await uji('Deteksi Loop Pengalihan (Redirect Loop)', async () => {
      let tertangkap = false;
      try {
        await klien.get(`${baseUrl}/redirect/loop1`, { maksimalPengalihan: 5 });
      } catch (err: any) {
        tertangkap = true;
        pastikan(err.pesan.includes('Terdeteksi perulangan pengalihan') || err.pesan.includes('Maksimal pengalihan'), 'Pesan redirect loop salah');
      }
      pastikan(tertangkap, 'Redirect loop harus melempar galat');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 6: Coba Ulang (Retry Policy) & Idempotensi
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 6: Kebijakan Coba Ulang (Retry) ---');

    await uji('Coba Ulang Otomatis pada Status 503 dengan Backoff', async () => {
      flakyCount = 0;
      const klienRetry = new KlienHTTP({
        cobaUlang: {
          maksimalPercobaan: 4,
          jedaAwalMs: 10,
          faktorEksponensial: 1.5,
          metodeBolehCobaUlang: ['GET'],
        }
      });

      const res = await klienRetry.get(`${baseUrl}/flaky`);
      pastikan(res.status === 200, 'Harus berhasil setelah percobaan coba ulang');
      pastikan(res.json<any>().suksesSetelahCobaUlang === true, 'Isi json flaky salah');
      pastikan(flakyCount === 3, `Flaky count harus 3, aktual ${flakyCount}`);
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 7: Transfer Berkas (Unduh & Unggah) & Keamanan Path
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 7: Transfer Berkas (Download & Upload) ---');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await uji('Pengunduh Berkas dengan Sanitasi Path', async () => {
      const fileTarget = path.join(tempDir, 'unduh_aman.txt');
      if (fs.existsSync(fileTarget)) {
        try { fs.unlinkSync(fileTarget); } catch {}
      }
      const pengunduh = new PengunduhBerkas(klien, { direktoriTujuan: tempDir });
      const hasil = await pengunduh.unduh(`${baseUrl}/unduh/berkas.txt`, {
        namaBerkasTujuan: 'unduh_aman.txt',
        timpaJikaAda: true,
      });

      pastikan(fs.existsSync(hasil.jalurBerkas), 'Berkas unduhan harus ada');
      const konten = fs.readFileSync(hasil.jalurBerkas, 'utf-8');
      pastikan(konten.includes('Nusantara HTTP Client Phase 35'), 'Konten unduhan tidak cocok');

      // Uji pencegahan path traversal
      let tertangkap = false;
      try {
        await pengunduh.unduh(`${baseUrl}/unduh/berkas.txt`, {
          namaBerkasTujuan: '../../etc/passwd_bahaya'
        });
      } catch (err: any) {
        tertangkap = true;
        pastikan(err.message.includes('Path traversal terdeteksi') || err.message.includes('ilegal'), 'Pesan path traversal salah');
      }
      pastikan(tertangkap, 'Path traversal harus diblokir');
    });

    await uji('Pengunggah Berkas Multipart', async () => {
      const berkasUji = path.join(tempDir, 'berkas_unggah.txt');
      fs.writeFileSync(berkasUji, 'Isi berkas yang akan diunggah melalui multipart');

      const pengunggah = new PengunggahBerkas(klien, { direktoriBasis: tempDir });
      const res = await pengunggah.unggah(`${baseUrl}/unggah`, {
        jalurBerkas: 'berkas_unggah.txt',
        namaField: 'dokumen',
        fieldTambahan: { judul: 'Laporan Fase 35' }
      });

      pastikan(res.status === 200, 'Upload multipart harus berhasil');
      const hasil = res.json<any>();
      pastikan(hasil.berisiFile === true, 'Server harus menerima file field');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 8: KlienAPI & Paginasi Otomatis
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 8: KlienAPI & Paginasi ---');

    await uji('KlienAPI CRUD dan Iterasi Paginasi Halaman', async () => {
      const api = new KlienAPI({ baseUrl });
      const ping = await api.dapatkan<{ pesan: string }>('/ping');
      pastikan(ping.pesan === 'pong', 'KlienAPI dapatkan() gagal');

      // Uji iterasi paginasi
      const iterator = api.iterasiPaginasi('/api/pengguna', {
        strategi: 'halaman',
        namaKunciHalaman: 'page',
        namaKunciBatas: 'limit',
        ekstraksiData: (res: any) => res.items,
        ekstraksiApakahHabis: (res: any) => res.habis,
      }, { limit: 2 });

      const semuaPengguna: any[] = [];
      for await (const chunk of iterator) {
        semuaPengguna.push(...chunk);
      }

      pastikan(semuaPengguna.length === 5, `Total pengguna harus 5, didapat ${semuaPengguna.length}`);
      pastikan(semuaPengguna[0].nama === 'Budi' && semuaPengguna[4].nama === 'Eko', 'Urutan paginasi tidak tepat');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 9: Webhook HMAC-SHA256 & Proteksi Replay Attack
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 9: Verifikasi Webhook HMAC ---');

    await uji('Verifikasi Webhook dengan Timing-Safe Equal & Replay Attack Defense', () => {
      const wh = new PengelolaWebhook({
        kunciRahasia: 'secret_key_super_aman_123',
        algoritma: 'sha256',
        toleransiWaktuDetik: 60,
      });

      const payload = JSON.stringify({ event: 'pembayaran.berhasil', id: 'trx_001' });
      const timestampSekarang = Math.floor(Date.now() / 1000);
      const tandaTangan = wh.buatTandaTangan(payload, timestampSekarang);

      // Verifikasi sah
      const sah = wh.verifikasiTandaTangan(payload, tandaTangan, timestampSekarang);
      pastikan(sah === true, 'Tanda tangan valid harus bernilai true');

      // Tanda tangan dipalsukan
      const tandaTanganPalsu = tandaTangan.slice(0, -4) + 'abcd';
      const palsuSah = wh.verifikasiTandaTangan(payload, tandaTanganPalsu, timestampSekarang);
      pastikan(palsuSah === false, 'Tanda tangan yang diubah harus ditolak');

      // Replay attack: timestamp sudah basi (10 menit lalu)
      const timestampUsang = timestampSekarang - 600;
      const tandaTanganUsang = wh.buatTandaTangan(payload, timestampUsang);
      const usangSah = wh.verifikasiTandaTangan(payload, tandaTanganUsang, timestampUsang);
      pastikan(usangSah === false, 'Timestamp usang harus ditolak (anti replay attack)');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 10: Adaptor Layanan Eksternal & Integrasi Realtime Task
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 10: Adaptor Layanan & Background Task Helper ---');

    await uji('Adaptor Layanan Email & Cuaca', async () => {
      const adaptorEmail = new AdaptorLayananEmail({
        baseUrl,
        apiKey: 'kunci-email',
      }, klien);

      const tugasHttp = buatTugasHTTP('kirim-notifikasi', {
        url: `${baseUrl}/ping`,
        metode: 'GET',
      });
      pastikan(tugasHttp.nama === 'kirim-notifikasi', 'Helper buatTugasHTTP salah nama');
      pastikan(tugasHttp.payload.metode === 'GET', 'Helper buatTugasHTTP salah payload');
    });

    // ------------------------------------------------------------------------
    // KELOMPOK 11: Integrasi Modul Standar Nusantara (`std:http`)
    // ------------------------------------------------------------------------
    console.log('\n--- Kelompok 11: Eksekusi Kode NUSANTARA (std:http) ---');

    await uji('Eksekusi Program .nusantara Menggunakan Modul http', () => {
      const kode = `program UjiHTTPFase35
gunakan "http" sebagai net

mulai
    tampilkan("--- UJI HTTP NUSANTARA ---")
    klien : peta = net.buatKlien()
    rahasia : teks = "kunci_nusantara_123"
    payload : teks = "pesan-uji"
    hasilVerif : logika = net.verifikasiWebhook(rahasia, payload, "tanda-tangan-salah")
    jika hasilVerif == salah maka
        tampilkan("Verifikasi webhook palsu berhasil ditolak")
    akhir
selesai`;

      const penulis = new PenulisOutputBuffer();
      const interpreter = new Interpreter(penulis);
      interpreter.jalankanKode(kode);

      const out = penulis.ambilOutput();
      pastikan(out.includes('--- UJI HTTP NUSANTARA ---'), 'Program Nusantara harus berjalan');
      pastikan(out.includes('Verifikasi webhook palsu berhasil ditolak'), 'Output program Nusantara tidak sesuai');
    });

  } finally {
    // Tutup mock server dan bersihkan direktori uji sementara
    mockServer.close();
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Abaikan jika pembersihan berkas sementara gagal
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`HASIL AKHIR: ${tesBerhasil} / ${totalTes} TES LULUS`);
  console.log('='.repeat(70));

  if (!lulusSemua || tesBerhasil < totalTes) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error dalam pengujian HTTP Phase 35:', err);
  process.exit(1);
});
