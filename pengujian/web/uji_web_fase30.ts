/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 30 Test Suite
 * Pengujian Komprehensif Web Application Framework (Router, Request/Response API,
 * Middleware Pipeline, Template Engine, Berkas Statis, Keamanan, Server HTTP, dan Integrasi Database).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import {
  AplikasiWeb,
  RouterWeb,
  MesinTemplate,
  PenanganBerkasStatis,
  lepasHTML,
  buatMiddlewareCORS,
  buatMiddlewareKeamanan,
  buatMiddlewarePembatasLaju,
  sanitasiKueriAman,
} from '../../src/web';
import {
  KATALOG_MODUL_STANDAR,
  apakahModulStandar,
  dapatkanSemuaModulStandar,
  buatEksporWeb,
} from '../../src/stdlib';
import { AdaptorSQLite } from '../../src/database';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { JenisNilaiRuntime, NilaiPeta, NilaiFungsiBawaan } from '../../src/interpreter/nilai';

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
  console.log('=== PENGUJIAN KOMPREHENSIF WEB APPLICATION FRAMEWORK (PHASE 30) ===\n');

  // ----------------------------------------------------------------------------
  // 1. REGISTRI MODUL STANDAR (web & http)
  // ----------------------------------------------------------------------------
  console.log('1. Pengujian Registri dan Katalog Modul Standar Fase 30:');

  await uji("Modul 'web' dan alias 'http' terdaftar di katalog stdlib", () => {
    pastikan(KATALOG_MODUL_STANDAR['web'] !== undefined, "Modul 'web' harus ada di katalog");
    pastikan(KATALOG_MODUL_STANDAR['http'] !== undefined, "Alias 'http' harus ada di katalog");
    pastikanSama(KATALOG_MODUL_STANDAR['web'].nama, 'web');
    pastikanSama(KATALOG_MODUL_STANDAR['http'].nama, 'http');
  });

  await uji('apakahModulStandar mengenali web, http, dan format prefix std:', () => {
    pastikan(apakahModulStandar('web'), 'web harus dikenali');
    pastikan(apakahModulStandar('http'), 'http harus dikenali');
    pastikan(apakahModulStandar('std:web'), 'std:web harus dikenali');
    pastikan(apakahModulStandar('stdlib:http'), 'stdlib:http harus dikenali');
    pastikan(apakahModulStandar('nusantara:web'), 'nusantara:web harus dikenali');
  });

  await uji('dapatkanSemuaModulStandar memuat modul Fase 30', () => {
    const semua = dapatkanSemuaModulStandar();
    pastikan(semua.includes('web'), 'Daftar harus memuat web');
    pastikan(semua.includes('http'), 'Daftar harus memuat http');
  });

  // ----------------------------------------------------------------------------
  // 2. ROUTER WEB (STATIC, PARAMETER DINAMIS, GROUPING, 404, 405)
  // ----------------------------------------------------------------------------
  console.log('\n2. Pengujian Router Web:');

  await uji('Pencocokan rute statis dan pengabaian trailing slash', () => {
    const router = new RouterWeb();
    router.get('/tentang', () => {});
    router.post('/kontak', () => {});

    const c1 = router.cocokkan('GET', '/tentang');
    pastikan(c1.hasil !== null, 'Rute /tentang harus cocok');
    pastikanSama(c1.hasil?.rute.pola, '/tentang');

    const c2 = router.cocokkan('GET', '/tentang/');
    pastikan(c2.hasil !== null, 'Rute /tentang/ harus cocok dengan normalisasi');

    const c404 = router.cocokkan('GET', '/layanan');
    pastikanSama(c404.hasil, null, 'Rute tidak ada harus bernilai null');
  });

  await uji('Pencocokan rute parameter dinamis (:id, :kategori/:itemId)', () => {
    const router = new RouterWeb();
    router.get('/artikel/:id', () => {});
    router.get('/kategori/:kat/produk/:itemId', () => {});

    const c1 = router.cocokkan('GET', '/artikel/123');
    pastikan(c1.hasil !== null);
    pastikanSama(c1.hasil?.parameter.id, '123');

    const c2 = router.cocokkan('GET', '/kategori/elektronik/produk/laptop-nusantara');
    pastikan(c2.hasil !== null);
    pastikanSama(c2.hasil?.parameter.kat, 'elektronik');
    pastikanSama(c2.hasil?.parameter.itemId, 'laptop-nusantara');
  });

  await uji('Route grouping (/api/v1/...)', () => {
    const router = new RouterWeb();
    router.grup('api/v1', g => {
      g.get('/pengguna', () => {});
      g.post('/pengguna', () => {});
    });

    const c1 = router.cocokkan('GET', '/api/v1/pengguna');
    pastikan(c1.hasil !== null);
    pastikanSama(c1.hasil?.rute.pola, '/api/v1/pengguna');

    const c2 = router.cocokkan('POST', '/api/v1/pengguna');
    pastikan(c2.hasil !== null);
  });

  await uji('Deteksi 405 Method Not Allowed dengan daftar Allow yang sah', () => {
    const router = new RouterWeb();
    router.get('/dokumen', () => {});
    router.post('/dokumen', () => {});

    const c = router.cocokkan('DELETE', '/dokumen');
    pastikanSama(c.hasil, null, 'Hasil rute cocok harus null');
    pastikan(c.metodeDiizinkan.includes('GET'), 'Metode GET harus ada di daftar izin');
    pastikan(c.metodeDiizinkan.includes('POST'), 'Metode POST harus ada di daftar izin');
  });

  // ----------------------------------------------------------------------------
  // 3. REQUEST & RESPONSE API (IN-MEMORY TEST RUNNER)
  // ----------------------------------------------------------------------------
  console.log('\n3. Pengujian Request & Response API:');

  await uji('Query string, params, headers, dan parsing JSON request body', async () => {
    const app = new AplikasiWeb();
    app.post('/api/pesan/:kategori', (req, res) => {
      const kat = req.ambilParam('kategori');
      const q = req.ambilKueri('format', 'standar');
      const auth = req.ambilTajuk('authorization');
      const badan = req.badanJSON<{ pesan: string }>();

      res.status(201).json({
        kategori: kat,
        format: q,
        terotorisasi: Boolean(auth),
        isiPesan: badan?.pesan,
      });
    });

    const hasil = await app.uji({
      metode: 'POST',
      jalur: '/api/pesan/notifikasi?format=ringkas',
      tajuk: { Authorization: 'Bearer token123' },
      badan: { pesan: 'Halo dari NUSANTARA Web!' },
    });

    pastikanSama(hasil.status, 201);
    const data = hasil.json();
    pastikanSama(data.kategori, 'notifikasi');
    pastikanSama(data.format, 'ringkas');
    pastikanSama(data.terotorisasi, true);
    pastikanSama(data.isiPesan, 'Halo dari NUSANTARA Web!');
  });

  await uji('Response API: Teks, HTML, Status, Redirect, dan Custom Headers', async () => {
    const app = new AplikasiWeb();
    app.dapatkan('/teks', (req, res) => res.teks('Pesan Teks Biasa'));
    app.dapatkan('/html', (req, res) => res.html('<h1>Judul Halaman</h1>'));
    app.dapatkan('/pindah', (req, res) => res.alihkan('/tujuan-baru', 301));
    app.dapatkan('/kustom', (req, res) => {
      res.status(202).tajuk('X-Aplikasi', 'NusantaraWeb').teks('Diterima');
    });

    const resTeks = await app.uji({ jalur: '/teks' });
    pastikanSama(resTeks.status, 200);
    pastikanSama(resTeks.badan, 'Pesan Teks Biasa');

    const resHTML = await app.uji({ jalur: '/html' });
    pastikan(resHTML.tajuk['Content-Type'].toString().includes('text/html'));

    const resPindah = await app.uji({ jalur: '/pindah' });
    pastikanSama(resPindah.status, 301);
    pastikanSama(resPindah.tajuk['Location'], '/tujuan-baru');

    const resKustom = await app.uji({ jalur: '/kustom' });
    pastikanSama(resKustom.status, 202);
    pastikanSama(resKustom.tajuk['X-Aplikasi'], 'NusantaraWeb');
  });

  // ----------------------------------------------------------------------------
  // 4. MIDDLEWARE PIPELINE
  // ----------------------------------------------------------------------------
  console.log('\n4. Pengujian Middleware Pipeline:');

  await uji('Urutan eksekusi berantai middleware dan penyematan data', async () => {
    const app = new AplikasiWeb();
    const urutan: string[] = [];

    app.gunakan(async (req, res, lanjut) => {
      urutan.push('M1_awal');
      await lanjut();
      urutan.push('M1_akhir');
    });

    app.gunakan(async (req, res, lanjut) => {
      urutan.push('M2_awal');
      await lanjut();
      urutan.push('M2_akhir');
    });

    app.dapatkan('/alur', (req, res) => {
      urutan.push('handler');
      res.teks('Selesai');
    });

    const hasil = await app.uji({ jalur: '/alur' });
    pastikanSama(hasil.status, 200);
    pastikanSama(urutan.join(','), 'M1_awal,M2_awal,handler,M2_akhir,M1_akhir');
  });

  await uji('Middleware Keamanan menyematkan Security Headers & Request ID', async () => {
    const app = new AplikasiWeb();
    app.dapatkan('/aman', (req, res) => res.teks('Aman'));

    const hasil = await app.uji({ jalur: '/aman' });
    pastikan(hasil.tajuk['X-Permintaan-ID'] !== undefined, 'Request ID harus disematkan');
    pastikanSama(hasil.tajuk['X-Content-Type-Options'], 'nosniff');
    pastikanSama(hasil.tajuk['X-Frame-Options'], 'SAMEORIGIN');
    pastikanSama(hasil.tajuk['X-XSS-Protection'], '1; mode=block');
  });

  await uji('Middleware CORS dengan kredensial dan preflight OPTIONS', async () => {
    const app = new AplikasiWeb();
    app.gunakan(
      buatMiddlewareCORS({
        asal: 'https://aplikasi-klien.id',
        kredensial: true,
      })
    );
    app.dapatkan('/api/data', (req, res) => res.json({ status: 'ok' }));

    // Request GET dari origin yang diizinkan
    const resGet = await app.uji({
      jalur: '/api/data',
      tajuk: { Origin: 'https://aplikasi-klien.id' },
    });
    pastikanSama(resGet.tajuk['Access-Control-Allow-Origin'], 'https://aplikasi-klien.id');
    pastikanSama(resGet.tajuk['Access-Control-Allow-Credentials'], 'true');

    // Preflight OPTIONS
    const resOptions = await app.uji({
      metode: 'OPTIONS',
      jalur: '/api/data',
      tajuk: { Origin: 'https://aplikasi-klien.id' },
    });
    pastikanSama(resOptions.status, 204);
    pastikan(resOptions.tajuk['Access-Control-Allow-Methods'].toString().includes('GET'));
  });

  await uji('Middleware Pembatas Laju (Rate Limiter) memblokir saat melebihi batas', async () => {
    const app = new AplikasiWeb();
    app.gunakan(buatMiddlewarePembatasLaju({ maksimalPermintaan: 3, jendelaMilidetik: 5000 }));
    app.dapatkan('/terbatas', (req, res) => res.teks('Berhasil'));

    // Panggilan 1, 2, 3 harus lolos
    const r1 = await app.uji({ jalur: '/terbatas' });
    const r2 = await app.uji({ jalur: '/terbatas' });
    const r3 = await app.uji({ jalur: '/terbatas' });
    pastikanSama(r1.status, 200);
    pastikanSama(r2.status, 200);
    pastikanSama(r3.status, 200);

    // Panggilan 4 harus diblokir (429)
    const r4 = await app.uji({ jalur: '/terbatas' });
    pastikanSama(r4.status, 429);
    pastikanSama(r4.json().galat, 'BATAS_LAJU_TERLAMPAUI');
  });

  await uji('Sanitasi log mencegah kebocoran data sensitif', () => {
    const kueri = {
      nama: 'Budi',
      password: 'rahasiaTingkatTinggi',
      token: 'jwt.token.abc',
      halaman: '1',
    };
    const aman = sanitasiKueriAman(kueri);
    pastikanSama(aman.nama, 'Budi');
    pastikanSama(aman.password, '[TERLINDUNGI]');
    pastikanSama(aman.token, '[TERLINDUNGI]');
    pastikanSama(aman.halaman, '1');
  });

  // ----------------------------------------------------------------------------
  // 5. TEMPLATE ENGINE & PENCEGAHAN XSS
  // ----------------------------------------------------------------------------
  console.log('\n5. Pengujian Mesin Template HTML & Pencegahan XSS:');

  await uji('lepasHTML mengamankan seluruh karakter berbahaya HTML', () => {
    const inputBahaya = '<script>alert("XSS & Kejahatan");</script>\'';
    const outputAman = lepasHTML(inputBahaya);
    pastikan(!outputAman.includes('<script>'), 'Tag script tidak boleh lolos');
    pastikan(outputAman.includes('&lt;script&gt;'));
    pastikan(outputAman.includes('&amp;'));
    pastikan(outputAman.includes('&quot;'));
    pastikan(outputAman.includes('&#39;'));
  });

  await uji('Template Engine: Interpolasi variabel, escaping default, dan raw unescaped', () => {
    const engine = new MesinTemplate();
    const tpl = 'Halo <b>{{ nama }}</b>, status: {{{ badgeMentah }}}';
    const hasil = engine.render(tpl, {
      nama: '<Admin>',
      badgeMentah: '<span class="badge">Aktif</span>',
    });

    pastikan(hasil.includes('&lt;Admin&gt;'), 'Variabel umum harus di-escape');
    pastikan(hasil.includes('<span class="badge">Aktif</span>'), 'Raw triple-mustache tidak di-escape');
  });

  await uji('Template Engine: Percabangan (jika/selain) dan Perulangan (untuk)', () => {
    const engine = new MesinTemplate();
    const tpl = `{{#jika terdaftar}}Selamat datang, {{ nama }}!{{#selain}}Silakan daftar.{{/jika}}
Daftar Buah:
{{#untuk b dalam buah}}
- {{ b.nama }} (Rp {{ b.harga }})
{{/untuk}}`;

    const data = {
      terdaftar: true,
      nama: 'Siti',
      buah: [
        { nama: 'Mangga', harga: 25000 },
        { nama: 'Salak', harga: 15000 },
      ],
    };

    const hasil = engine.render(tpl, data);
    pastikan(hasil.includes('Selamat datang, Siti!'));
    pastikan(hasil.includes('- Mangga (Rp 25000)'));
    pastikan(hasil.includes('- Salak (Rp 15000)'));
  });

  await uji('Template Engine: Layout dan Partial', () => {
    const engine = new MesinTemplate();
    engine.daftarkanLayout('utama', '<header>{{> navigasi }}</header><main>{{{ konten }}}</main>');
    engine.daftarkanPartial('navigasi', '<nav><a href="/">Beranda</a></nav>');
    engine.daftarkan('beranda', '<h2>Selamat Datang di Situs NUSANTARA</h2>');

    const hasil = engine.render('beranda', {}, { layout: 'utama' });
    pastikan(hasil.includes('<nav><a href="/">Beranda</a></nav>'));
    pastikan(hasil.includes('<h2>Selamat Datang di Situs NUSANTARA</h2>'));
  });

  // ----------------------------------------------------------------------------
  // 6. BERKAS STATIS & KEAMANAN PATH TRAVERSAL
  // ----------------------------------------------------------------------------
  console.log('\n6. Pengujian Berkas Statis & Proteksi Path Traversal:');

  const folderUjiStatis = path.join(process.cwd(), 'temp_uji_web_statis');
  if (!fs.existsSync(folderUjiStatis)) {
    fs.mkdirSync(folderUjiStatis, { recursive: true });
  }
  fs.writeFileSync(path.join(folderUjiStatis, 'gaya.css'), 'body { background: #000; }');
  fs.writeFileSync(path.join(folderUjiStatis, 'index.html'), '<h1>Beranda Statis</h1>');
  fs.writeFileSync(path.join(folderUjiStatis, '.env'), 'SECRET_KEY=rahasia123');

  try {
    await uji('Menyajikan berkas statis dengan MIME type yang benar', async () => {
      const app = new AplikasiWeb();
      app.berkasStatis('/aset', folderUjiStatis);

      const resCSS = await app.uji({ jalur: '/aset/gaya.css' });
      pastikanSama(resCSS.status, 200);
      pastikan(resCSS.tajuk['Content-Type'].toString().includes('text/css'));
      pastikan(resCSS.badan.includes('background: #000'));
    });

    await uji('Penolakan Path Traversal (../../etc/passwd) dengan 403 Forbidden', async () => {
      const app = new AplikasiWeb();
      app.berkasStatis('/aset', folderUjiStatis);

      const resJahat = await app.uji({ jalur: '/aset/../../../../etc/passwd' });
      pastikanSama(resJahat.status, 403);
      pastikan(resJahat.json().galat.includes('AKSES_JALUR_ILEGAL'));
    });

    await uji('Penolakan Berkas Tersembunyi (.env) dengan 403 Forbidden', async () => {
      const app = new AplikasiWeb();
      app.berkasStatis('/aset', folderUjiStatis);

      const resEnv = await app.uji({ jalur: '/aset/.env' });
      pastikanSama(resEnv.status, 403);
      pastikan(resEnv.json().galat.includes('AKSES_JALUR_ILEGAL'));
    });
  } finally {
    try {
      fs.rmSync(folderUjiStatis, { recursive: true, force: true });
    } catch {
      // Abaikan
    }
  }

  // ----------------------------------------------------------------------------
  // 7. REST API DENGAN DATABASE SQLITE NUSANTARA
  // ----------------------------------------------------------------------------
  console.log('\n7. Pengujian REST API CRUD dengan Database SQLite NUSANTARA:');

  await uji('CRUD Lengkap Produk: GET, POST, PUT, DELETE terhubung basis data', async () => {
    const db = new AdaptorSQLite();
    db.buka({ jalur: ':memory:' });
    db.eksekusi('CREATE TABLE produk (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, harga REAL)');

    const app = new AplikasiWeb();

    // GET /api/produk
    app.dapatkan('/api/produk', (req, res) => {
      const rows = db.ambilSemua('SELECT * FROM produk ORDER BY id ASC');
      res.json({ sukses: true, data: rows });
    });

    // POST /api/produk
    app.kirimkan('/api/produk', (req, res) => {
      const b = req.badanJSON<{ nama: string; harga: number }>();
      if (!b || !b.nama || b.harga === undefined) {
        res.status(400).json({ sukses: false, pesan: 'Nama dan harga wajib diisi' }, 400);
        return;
      }
      const ins = db.eksekusi('INSERT INTO produk (nama, harga) VALUES (?, ?)', [b.nama, b.harga]);
      res.status(201).json({ sukses: true, id: ins.idTerakhir }, 201);
    });

    // PUT /api/produk/:id
    app.perbarui('/api/produk/:id', (req, res) => {
      const id = Number(req.ambilParam('id'));
      const b = req.badanJSON<{ nama: string; harga: number }>();
      const upd = db.eksekusi('UPDATE produk SET nama = ?, harga = ? WHERE id = ?', [
        b?.nama ?? '',
        b?.harga ?? 0,
        id,
      ]);
      res.json({ sukses: true, terpengaruh: upd.barisTerpengaruh });
    });

    // DELETE /api/produk/:id
    app.hapus('/api/produk/:id', (req, res) => {
      const id = Number(req.ambilParam('id'));
      const del = db.eksekusi('DELETE FROM produk WHERE id = ?', [id]);
      res.json({ sukses: true, terpengaruh: del.barisTerpengaruh });
    });

    // 1. POST insert produk 1 & 2
    const p1 = await app.uji({
      metode: 'POST',
      jalur: '/api/produk',
      badan: { nama: 'Kopi Arabika Gayo', harga: 48000 },
    });
    pastikanSama(p1.status, 201);
    pastikanSama(p1.json().id, 1);

    const p2 = await app.uji({
      metode: 'POST',
      jalur: '/api/produk',
      badan: { nama: 'Teh Putih Nusantara', harga: 35000 },
    });
    pastikanSama(p2.status, 201);
    pastikanSama(p2.json().id, 2);

    // 2. GET list produk
    const list = await app.uji({ jalur: '/api/produk' });
    pastikanSama(list.status, 200);
    pastikanSama(list.json().data.length, 2);

    // 3. PUT update produk 1
    const upd = await app.uji({
      metode: 'PUT',
      jalur: '/api/produk/1',
      badan: { nama: 'Kopi Arabika Gayo Premium', harga: 52000 },
    });
    pastikanSama(upd.json().terpengaruh, 1);

    // 4. DELETE produk 2
    const del = await app.uji({
      metode: 'DELETE',
      jalur: '/api/produk/2',
    });
    pastikanSama(del.json().terpengaruh, 1);

    // 5. Verifikasi sisa produk
    const sisa = await app.uji({ jalur: '/api/produk' });
    pastikanSama(sisa.json().data.length, 1);
    pastikanSama(sisa.json().data[0].nama, 'Kopi Arabika Gayo Premium');

    db.tutup();
  });

  // ----------------------------------------------------------------------------
  // 8. SERVER HTTP LIFECYCLE & SOCKET BINDING NYATA
  // ----------------------------------------------------------------------------
  console.log('\n8. Pengujian Siklus Hidup Server HTTP Nyata (Socket Binding):');

  await uji('Server HTTP mulai, menangani permintaan TCP nyata, dan berhenti bersih', async () => {
    const app = new AplikasiWeb();
    app.dapatkan('/ping', (req, res) => res.teks('PONG!'));

    // Gunakan port dinamis acak (port 0)
    pastikan(!app.apakahBerjalan(), 'Sebelum mulai, server harus belum berjalan');
    const info = await app.mulai(0, '127.0.0.1');
    pastikan(app.apakahBerjalan(), 'Setelah mulai, server harus berjalan');
    pastikan(info.port > 0, 'Port harus dialokasikan');

    // Lakukan HTTP request nyata via node:http
    const responTeks = await new Promise<string>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${info.port}/ping`, res => {
          let chunks = '';
          res.on('data', c => (chunks += c));
          res.on('end', () => resolve(chunks));
        })
        .on('error', reject);
    });

    pastikanSama(responTeks, 'PONG!');

    // Berhenti server
    await app.berhenti();
    pastikan(!app.apakahBerjalan(), 'Setelah berhenti, server harus tidak aktif');
  });

  // ----------------------------------------------------------------------------
  // 9. PABRIK EKSPOR STDLIB: web
  // ----------------------------------------------------------------------------
  console.log('\n9. Pengujian Pabrik Ekspor Standard Library web:');

  await uji('Ekspor modul web menyediakan buatAplikasi, uraiJSON, cetakJSON, lepasHTML', () => {
    const ekspor = buatEksporWeb();
    pastikan(ekspor.has('buatAplikasi'));
    pastikan(ekspor.has('uraiJSON'));
    pastikan(ekspor.has('cetakJSON'));
    pastikan(ekspor.has('lepasHTML'));

    const fnLepas = ekspor.get('lepasHTML') as NilaiFungsiBawaan;
    const resLepas = fnLepas.eksekusi([{ jenis: JenisNilaiRuntime.TEKS, nilai: '<test>' }]);
    pastikanSama((resLepas as any).nilai, '&lt;test&gt;');
  });

  // ----------------------------------------------------------------------------
  // 10. INTEGRASI PENUH INTERPRETER DENGAN PROGRAM .nusantara
  // ----------------------------------------------------------------------------
  console.log('\n10. Pengujian Integrasi Penuh Interpreter dengan Modul web:');

  function jalankanProgram(kode: string): string {
    const buffer = new PenulisOutputBuffer();
    const interpreter = new Interpreter(buffer);
    interpreter.jalankanKode(kode);
    return buffer.dapatkanSeluruhTeks().join('\n');
  }

  await uji('Program NUSANTARA: Membuat Aplikasi Web, Mendaftarkan Template, Render, dan Uji API', () => {
    const kode = `program UjiWebDasar
gunakan "web" sebagai web
gunakan "koleksi" sebagai koleksi

fungsi tanganiStatus(req : peta, res : peta)
mulai
    res.json({ "layanan": "aktif", "versi": "1.0.0" })
selesai

mulai
    app : peta = web.buatAplikasi()
    
    // Uji template
    app.daftarkanTemplate("kartu", "<div class='kartu'>{{ nama }} - Rp {{ harga }}</div>")
    hasilRender : teks = app.render("kartu", { "nama": "Kopi Java", "harga": 30000 })
    tampilkan("Hasil Render:", hasilRender)
    
    // Daftarkan rute
    app.dapatkan("/status", tanganiStatus)
    
    tampilkan("Aplikasi Web Siap!")
selesai
`;

    const logs = jalankanProgram(kode);
    pastikan(logs.includes("Hasil Render: <div class='kartu'>Kopi Java - Rp 30000</div>"));
    pastikan(logs.includes('Aplikasi Web Siap!'));
  });

  // ----------------------------------------------------------------------------
  // REKAPITULASI
  // ----------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`HASIL PENGUJIAN PHASE 30: ${totalLulus} Lulus, ${totalGagal} Gagal dari ${totalUji} Uji.`);
  console.log('=============================================================================');

  if (totalGagal > 0) {
    process.exit(1);
  }
}

jalankanSemuaPengujian();
