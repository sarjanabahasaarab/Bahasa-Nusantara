/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ServerBahasaNUSANTARA,
  ManajerDokumen,
  PembacaBingkaiLSP,
  formatPesanBingkaiLSP,
  KodeGalatJSONRPC,
  PesanJSONRPC,
  NotifikasiJSONRPC,
  PermintaanJSONRPC,
} from '../../src/language-server';
import { PembacaBerkasMemori } from '../../src/modul';
import { NusantaraCLI } from '../../src/paket/cli';

let totalUji = 0;
let ujiBerhasil = 0;
let ujiGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>): void {
  totalUji++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          ujiBerhasil++;
          console.log(`  ✓ ${nama}`);
        })
        .catch(err => {
          ujiGagal++;
          console.error(`  ✗ ${nama}: ${err.message || err}`);
        });
    } else {
      ujiBerhasil++;
      console.log(`  ✓ ${nama}`);
    }
  } catch (err: any) {
    ujiGagal++;
    console.error(`  ✗ ${nama}: ${err.message || err}`);
  }
}

function tegaskan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(`Penegasan Gagal: ${pesan}`);
  }
}

async function jalankanPengujianLSP(): Promise<void> {
  console.log('=============================================================================');
  console.log('PENGUJIAN LANGUAGE SERVER & DEVELOPER TOOLS BAHASA NUSANTARA (PHASE 20)');
  console.log('Target Milestone: v0.20.0');
  console.log('=============================================================================\n');

  // --- KELOMPOK 1: SIKLUS HIDUP SERVER (LIFECYCLE) ---
  console.log('--- Kelompok 1: Siklus Hidup Server (Lifecycle) ---');

  await (async () => {
    const server = new ServerBahasaNUSANTARA({ janganKeluarOtomatis: true });

    // 1. Inisialisasi Server
    const resInit: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        processId: null,
        rootUri: 'file:///proyek',
        capabilities: {},
      },
    });

    uji('Server merespons initialize dengan kapabilitas lengkap', () => {
      tegaskan(resInit !== null, 'Respons inisialisasi tidak boleh null');
      tegaskan(resInit.result !== undefined, 'Hasil inisialisasi harus ada');
      tegaskan(resInit.result.capabilities.hoverProvider === true, 'Hover provider harus aktif');
      tegaskan(resInit.result.capabilities.definitionProvider === true, 'Definition provider harus aktif');
      tegaskan(resInit.result.capabilities.completionProvider !== undefined, 'Completion provider harus ada');
      tegaskan(resInit.result.serverInfo.version === '0.20.0', 'Versi server harus v0.20.0');
    });

    // 2. Notifikasi Initialized
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'initialized',
      params: {},
    });
    uji('Server menerima notifikasi initialized tanpa galat', () => {
      tegaskan(true, 'Initialized berhasil diterima');
    });

    // 3. Permintaan Shutdown
    const resShutdown: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 2,
      method: 'shutdown',
      params: null,
    });
    uji('Server merespons shutdown dengan hasil null', () => {
      tegaskan(resShutdown.result === null, 'Hasil shutdown harus null sesuai spesifikasi LSP');
    });

    // 4. Notifikasi Exit
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'exit',
      params: null,
    });
    uji('Server menerima notifikasi exit secara bersih', () => {
      tegaskan(true, 'Exit berhasil diterima');
    });
  })();

  // --- KELOMPOK 2: MANAJEMEN DOKUMEN & INVALIDASI CACHE ---
  console.log('\n--- Kelompok 2: Manajemen Dokumen & Invalidasi Cache ---');

  {
    const manajer = new ManajerDokumen();
    const uri = 'file:///proyek/utama.nusantara';

    // Buka Dokumen
    const dok = manajer.bukaDokumen(uri, 'nusantara', 1, 'program Demo\nmulai\n    tampilkan(1)\nselesai');
    uji('Membuka dokumen dan menghitung offset baris', () => {
      tegaskan(dok.version === 1, 'Versi dokumen harus 1');
      tegaskan(dok.barisOffset.length === 4, 'Jumlah baris harus 4');
      tegaskan(dok.barisOffset[0] === 0, 'Awal baris 0 harus 0');
    });

    // Konversi Posisi ke Indeks dan sebaliknya
    uji('Konversi PosisiLSP ke indeks karakter string akurat', () => {
      const idx = manajer.posisiKeIndeks(dok, { line: 1, character: 0 });
      tegaskan(dok.konten.substring(idx).startsWith('mulai'), 'Karakter pada posisi baris 1 kolom 0 harus mulai');
      const pos = manajer.indeksKePosisi(dok, idx);
      tegaskan(pos.line === 1 && pos.character === 0, 'Konversi balik indeks harus menghasilkan line 1 character 0');
    });

    // Pembaruan Dokumen (didChange)
    dok.astCache = {} as any; // Pasang cache buatan
    const dokBaru = manajer.perbaruiDokumen(uri, 2, [
      { text: 'program Demo\nmulai\n    tampilkan("halo")\nselesai' },
    ]);
    uji('Pembaruan dokumen memutakhirkan isi dan menginvaliasi cache', () => {
      tegaskan(dokBaru !== null && dokBaru.version === 2, 'Versi harus naik menjadi 2');
      tegaskan(dokBaru?.konten.includes('"halo"') === true, 'Teks baru harus termuat');
      tegaskan(dokBaru?.astCache === undefined, 'Cache AST harus diinvaliasi');
    });

    // Penolakan Update Stale (versi lebih rendah)
    manajer.perbaruiDokumen(uri, 1, [{ text: 'konten basi' }]);
    uji('Menolak pembaruan dengan versi dokumen yang lebih rendah (stale version guard)', () => {
      tegaskan(dok.konten.includes('"halo"'), 'Isi tidak boleh berubah jika versi basi');
    });

    // Penutupan Dokumen (didClose)
    const berhasilTutup = manajer.tutupDokumen(uri);
    uji('Menutup dokumen menghapus entri dari memori', () => {
      tegaskan(berhasilTutup === true, 'Harus sukses menghapus dokumen');
      tegaskan(manajer.ambilDokumen(uri) === undefined, 'Dokumen harus tidak ditemukan lagi');
    });
  }

  // --- KELOMPOK 3: DIAGNOSTIK REAL-TIME (PARSER, TIPE, LINTER) ---
  console.log('\n--- Kelompok 3: Diagnostik Real-Time (Parser, Tipe, Linter) ---');

  await (async () => {
    let diagnostikTerkirim: any = null;
    const server = new ServerBahasaNUSANTARA({
      pengirimPesan: (pesan: PesanJSONRPC) => {
        if ((pesan as NotifikasiJSONRPC).method === 'textDocument/publishDiagnostics') {
          diagnostikTerkirim = (pesan as NotifikasiJSONRPC).params;
        }
      },
    });

    // Inisialisasi
    await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 10,
      method: 'initialize',
      params: { processId: null, rootUri: null, capabilities: {} },
    });

    // 1. Dokumen dengan kesalahan sintaksis parser
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///sintaks_cacat.nusantara',
          languageId: 'nusantara',
          version: 1,
          text: 'program Rusak\nmulai\n    variabel x = \nselesai',
        },
      },
    });

    uji('Mendeteksi dan mengirimkan diagnostik galat sintaksis parser', () => {
      tegaskan(diagnostikTerkirim !== null, 'Notifikasi publishDiagnostics harus terkirim');
      tegaskan(diagnostikTerkirim.diagnostics.length > 0, 'Harus ada diagnostik galat');
      tegaskan(diagnostikTerkirim.diagnostics[0].severity === 1, 'Tingkat keparahan harus Error (1)');
    });

    // 2. Dokumen dengan kesalahan tipe statis
    diagnostikTerkirim = null;
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///tipe_cacat.nusantara',
          languageId: 'nusantara',
          version: 1,
          text: 'program TipeSalah\nmulai\n    angka : bilangan = "teks bukan angka"\nselesai',
        },
      },
    });

    uji('Mendeteksi kesalahan sistem tipe (Type Error) dengan kode resmi', () => {
      tegaskan(diagnostikTerkirim !== null, 'Notifikasi tipe cacat harus terkirim');
      const err = diagnostikTerkirim.diagnostics.find((d: any) => String(d.code).includes('TYP'));
      tegaskan(err !== undefined, 'Harus memuat kode diagnostik NUS-TYP');
      tegaskan(err.message.toLowerCase().includes('tipe'), 'Pesan harus menjelaskan ketidakcocokan tipe');
    });

    // 3. Dokumen bersih dengan peringatan linter NUS-W001
    diagnostikTerkirim = null;
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///linter_warn.nusantara',
          languageId: 'nusantara',
          version: 1,
          text: 'program LinterWarn\nmulai\n    variabel takTerpakai : bilangan = 10\n    tampilkan("Selesai")\nselesai',
        },
      },
    });

    uji('Mendeteksi peringatan linter (Warning) NUS-W001 variabel tak terpakai', () => {
      tegaskan(diagnostikTerkirim !== null, 'Notifikasi linter harus terkirim');
      const warn = diagnostikTerkirim.diagnostics.find((d: any) => d.code === 'NUS-W001');
      tegaskan(warn !== undefined, 'Harus memuat peringatan NUS-W001');
      tegaskan(warn.severity === 2, 'Tingkat keparahan linter harus Warning (2)');
    });

    // 4. Dokumen bersih tanpa kesalahan
    diagnostikTerkirim = null;
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: 'file:///bersih.nusantara',
          languageId: 'nusantara',
          version: 1,
          text: 'program Bersih\nmulai\n    angka : bilangan = 100\n    tampilkan(angka)\nselesai',
        },
      },
    });

    uji('Dokumen sah dan bersih menghasilkan 0 diagnostik', () => {
      tegaskan(diagnostikTerkirim !== null, 'Notifikasi harus terkirim');
      tegaskan(diagnostikTerkirim.diagnostics.length === 0, 'Daftar diagnostik harus kosong');
    });
  })();

  // --- KELOMPOK 4: PENYELESAIAN OTOMATIS (COMPLETION / AUTOCOMPLETE) ---
  console.log('\n--- Kelompok 4: Penyelesaian Otomatis (Completion) ---');

  await (async () => {
    const server = new ServerBahasaNUSANTARA();
    await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 20,
      method: 'initialize',
      params: { processId: null, rootUri: null, capabilities: {} },
    });

    const uri = 'file:///completion.nusantara';
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId: 'nusantara',
          version: 1,
          text: `program DemoKompleksi
gunakan "matematika" sebagai mtk

fungsi hitungTotal(harga : bilangan) : bilangan
mulai
    kembalikan harga
selesai

mulai
    totalBelanja : bilangan = 50000
    
selesai`,
        },
      },
    });

    // 1. Completion Kata Kunci & Simbol Global pada baris kosong
    const resGeneral: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 21,
      method: 'textDocument/completion',
      params: {
        textDocument: { uri },
        position: { line: 10, character: 4 }, // di dalam blok mulai
      },
    });

    uji('Menawarkan completion kata kunci resmi (jika, untuk, fungsi, dll.)', () => {
      const items = resGeneral.result.items;
      const adaJika = items.some((it: any) => it.label === 'jika');
      const adaUntuk = items.some((it: any) => it.label === 'untuk');
      tegaskan(adaJika && adaUntuk, 'Kata kunci resmi jika dan untuk harus tersedia');
    });

    uji('Menawarkan fungsi bawaan dan fungsi pengguna (tampilkan, hitungTotal)', () => {
      const items = resGeneral.result.items;
      const adaTampilkan = items.some((it: any) => it.label === 'tampilkan');
      const adaHitungTotal = items.some((it: any) => it.label === 'hitungTotal');
      tegaskan(adaTampilkan, 'Fungsi bawaan tampilkan harus ada');
      tegaskan(adaHitungTotal, 'Fungsi pengguna hitungTotal harus ada');
    });

    uji('Menawarkan variabel lokal (totalBelanja)', () => {
      const items = resGeneral.result.items;
      const adaVariabel = items.some((it: any) => it.label === 'totalBelanja');
      tegaskan(adaVariabel, 'Variabel lokal totalBelanja harus ditawarkan');
    });

    // 2. Completion Anggota Modul Standar: mtk.
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didChange',
      params: {
        textDocument: { uri, version: 2 },
        contentChanges: [
          {
            text: `program DemoKompleksi\ngunakan "matematika" sebagai mtk\nmulai\n    mtk.\nselesai`,
          },
        ],
      },
    });

    const resDot: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 22,
      method: 'textDocument/completion',
      params: {
        textDocument: { uri },
        position: { line: 3, character: 8 }, // setelah mtk.
      },
    });

    uji('Menawarkan anggota fungsi modul matematika pada akses titik mtk.', () => {
      const items = resDot.result.items;
      const adaPI = items.some((it: any) => it.label === 'PI');
      const adaPangkat = items.some((it: any) => it.label === 'pangkat');
      const adaAkar = items.some((it: any) => it.label === 'akar');
      tegaskan(adaPI, 'Konstanta PI harus ada di mtk.');
      tegaskan(adaPangkat, 'Fungsi pangkat harus ada di mtk.');
      tegaskan(adaAkar, 'Fungsi akar harus ada di mtk.');
    });
  })();

  // --- KELOMPOK 5: INFORMASI MENGAMBANG (HOVER) ---
  console.log('\n--- Kelompok 5: Informasi Mengambang (Hover) ---');

  await (async () => {
    const server = new ServerBahasaNUSANTARA();
    await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 30,
      method: 'initialize',
      params: { processId: null, rootUri: null, capabilities: {} },
    });

    const uri = 'file:///hover.nusantara';
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId: 'nusantara',
          version: 1,
          text: `program DemoHover
gunakan "teks" sebagai teks

fungsi sapaNama(pengguna : teks) : teks
mulai
    kembalikan "Halo, " + pengguna
selesai

mulai
    skor : bilangan = 95
    teks.kapital("nusantara")
    tampilkan(skor)
selesai`,
        },
      },
    });

    // 1. Hover Variabel
    const resVar: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 31,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line: 9, character: 5 }, // pada kata 'skor'
      },
    });

    uji('Hover pada variabel menampilkan nama dan tipe bilangan', () => {
      tegaskan(resVar.result !== null, 'Hover variabel tidak boleh null');
      const konten = resVar.result.contents.value;
      tegaskan(konten.includes('skor: bilangan'), 'Harus memuat skor: bilangan');
    });

    // 2. Hover Fungsi Pengguna
    const resFn: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 32,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line: 3, character: 9 }, // pada kata 'sapaNama'
      },
    });

    uji('Hover pada fungsi menampilkan signature parameter dan tipe kembalian', () => {
      tegaskan(resFn.result !== null, 'Hover fungsi tidak boleh null');
      const konten = resFn.result.contents.value;
      tegaskan(konten.includes('fungsi sapaNama(pengguna: teks): teks'), 'Harus memuat signature sapaNama');
    });

    // 3. Hover Anggota Modul Standar (teks.kapital)
    const resModulMember: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 33,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line: 10, character: 10 }, // pada kata 'kapital'
      },
    });

    uji('Hover pada anggota modul teks.kapital menampilkan signature dan dokumentasi', () => {
      tegaskan(resModulMember.result !== null, 'Hover anggota modul tidak boleh null');
      const konten = resModulMember.result.contents.value;
      tegaskan(konten.includes('teks.kapital'), 'Harus memuat teks.kapital');
      tegaskan(konten.includes('Modul Standar'), 'Harus menyebut modul standar');
    });

    // 4. Hover Kata Kunci (fungsi)
    const resKw: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 34,
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position: { line: 3, character: 1 }, // pada kata 'fungsi'
      },
    });

    uji('Hover pada kata kunci resmi menampilkan penjelasan glosarium', () => {
      tegaskan(resKw.result !== null, 'Hover kata kunci tidak boleh null');
      tegaskan(resKw.result.contents.value.includes('Mendeklarasikan fungsi'), 'Harus memuat penjelasan fungsi');
    });
  })();

  // --- KELOMPOK 6: LOMPAT KE DEFINISI (GO-TO-DEFINITION) ---
  console.log('\n--- Kelompok 6: Lompat ke Definisi (Go-to-Definition) ---');

  await (async () => {
    const fsMemori = new PembacaBerkasMemori({
      '/proyek/utilitas.nusantara': `modul utilitas\nekspor fungsi kaliDua(n : bilangan) : bilangan\nmulai\n    kembalikan n * 2\nselesai`,
    });

    const server = new ServerBahasaNUSANTARA({
      pembacaBerkas: fsMemori,
      direktoriKerja: '/proyek',
    });

    await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 40,
      method: 'initialize',
      params: { processId: null, rootUri: 'file:///proyek', capabilities: {} },
    });

    const uriUtama = 'file:///proyek/utama.nusantara';
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri: uriUtama,
          languageId: 'nusantara',
          version: 1,
          text: `program Utama
gunakan "utilitas" sebagai util

fungsi kuadrat(x : bilangan) : bilangan
mulai
    kembalikan x * x
selesai

mulai
    nilaiAwal : bilangan = 10
    hasil : bilangan = kuadrat(nilaiAwal)
    hasilDua : bilangan = util.kaliDua(hasil)
selesai`,
        },
      },
    });

    // 1. Definisi Variabel Lokal (nilaiAwal pada baris 10)
    const resDefVar: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 41,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri: uriUtama },
        position: { line: 10, character: 33 }, // pada kata 'nilaiAwal' di baris hasil
      },
    });

    uji('Lompat ke deklarasi variabel lokal di berkas yang sama', () => {
      tegaskan(resDefVar.result !== null, 'Lokasi definisi tidak boleh null');
      tegaskan(resDefVar.result.uri === uriUtama, 'URI harus berkas utama');
      tegaskan(resDefVar.result.range.start.line === 9, 'Harus menunjuk ke baris 9 deklarasi nilaiAwal');
    });

    // 2. Definisi Fungsi Lokal (kuadrat pada baris 10)
    const resDefFn: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 42,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri: uriUtama },
        position: { line: 10, character: 25 }, // pada kata 'kuadrat'
      },
    });

    uji('Lompat ke deklarasi fungsi lokal di berkas yang sama', () => {
      tegaskan(resDefFn.result !== null, 'Lokasi fungsi tidak boleh null');
      tegaskan(resDefFn.result.range.start.line === 3, 'Harus menunjuk ke baris 3 deklarasi fungsi kuadrat');
    });

    // 3. Definisi Lintas Berkas (Cross-File Definition: util.kaliDua pada baris 11)
    const resDefCross: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 43,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri: uriUtama },
        position: { line: 11, character: 33 }, // pada kata 'kaliDua'
      },
    });

    uji('Lompat ke definisi lintas berkas modul (utilitas.nusantara -> kaliDua)', () => {
      tegaskan(resDefCross.result !== null, 'Lokasi definisi modul luar tidak boleh null');
      tegaskan(resDefCross.result.uri.includes('utilitas.nusantara'), 'URI harus menunjuk ke utilitas.nusantara');
      tegaskan(resDefCross.result.range.start.line === 1, 'Harus menunjuk ke baris 1 ekspor fungsi kaliDua');
    });

    // 4. Keamanan saat simbol tidak ditemukan
    const resDefNotFound: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 44,
      method: 'textDocument/definition',
      params: {
        textDocument: { uri: uriUtama },
        position: { line: 0, character: 0 }, // posisi kosong
      },
    });

    uji('Aman dan tidak crash saat simbol tidak ditemukan', () => {
      tegaskan(resDefNotFound.result === null, 'Harus mengembalikan null secara aman');
    });
  })();

  // --- KELOMPOK 7: SIMBOL DOKUMEN & WORKSPACE (SYMBOLS) ---
  console.log('\n--- Kelompok 7: Simbol Dokumen & Workspace (Symbols) ---');

  await (async () => {
    const fsMemori = new PembacaBerkasMemori({
      '/proyek/modul_a.nusantara': `modul modul_a\nekspor fungsi prosesA() : kosong\nmulai\nselesai`,
    });

    const server = new ServerBahasaNUSANTARA({
      pembacaBerkas: fsMemori,
      direktoriKerja: '/proyek',
    });

    await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 50,
      method: 'initialize',
      params: { processId: null, rootUri: 'file:///proyek', capabilities: {} },
    });

    const uri = 'file:///proyek/simbol.nusantara';
    await server.tanganiPesan({
      jsonrpc: '2.0',
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId: 'nusantara',
          version: 1,
          text: `program DemoSimbol
fungsi hitungTotal(a : bilangan, b : bilangan) : bilangan
mulai
    variabel subtotal : bilangan = a + b
    kembalikan subtotal
selesai

mulai
    totalGaji : bilangan = hitungTotal(10, 20)
selesai`,
        },
      },
    });

    // 1. Document Symbols
    const resDocSym: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 51,
      method: 'textDocument/documentSymbol',
      params: { textDocument: { uri } },
    });

    uji('Mengekstrak simbol dokumen berhierarki (Program, Fungsi, Variabel)', () => {
      tegaskan(Array.isArray(resDocSym.result), 'Hasil simbol dokumen harus array');
      const root = resDocSym.result[0];
      tegaskan(root.name === 'DemoSimbol', 'Akar simbol harus DemoSimbol');
      const fnSym = root.children.find((c: any) => c.name === 'hitungTotal');
      tegaskan(fnSym !== undefined, 'Harus memuat simbol fungsi hitungTotal');
      tegaskan(fnSym.children.length >= 2, 'Fungsi harus memiliki anak parameter dan variabel lokal');
    });

    // 2. Workspace Symbols
    const resWsSym: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 52,
      method: 'workspace/symbol',
      params: { query: 'hitung' },
    });

    uji('Pencarian simbol workspace (workspace/symbol) menemukan simbol yang cocok', () => {
      tegaskan(Array.isArray(resWsSym.result), 'Hasil simbol workspace harus array');
      const ada = resWsSym.result.some((s: any) => s.name === 'hitungTotal');
      tegaskan(ada, 'Harus menemukan simbol hitungTotal dari kueri hitung');
    });
  })();

  // --- KELOMPOK 8: PROTOKOL FRAMING JSON-RPC & INTEGRASI CLI ---
  console.log('\n--- Kelompok 8: Protokol Framing JSON-RPC & Integrasi CLI ---');

  {
    // 1. Framing Pesan LSP (Header Content-Length)
    const payload = { jsonrpc: '2.0', id: 99, result: 'sukses' };
    const bingkai = formatPesanBingkaiLSP(payload);

    uji('Format framing pesan LSP memuat Content-Length yang presisi', () => {
      tegaskan(bingkai.startsWith('Content-Length: '), 'Harus diawali header Content-Length');
      tegaskan(bingkai.includes('\r\n\r\n{"jsonrpc":"2.0"'), 'Harus dipisahkan CRLF ganda');
    });

    // 2. Parser Streaming Bingkai LSP
    const pembaca = new PembacaBingkaiLSP();
    const pesanEkstrak = pembaca.prosesPotongan(bingkai);

    uji('PembacaBingkaiLSP mengurai payload terbingkai secara sempurna', () => {
      tegaskan(pesanEkstrak.length === 1, 'Harus mengekstrak 1 pesan');
      tegaskan((pesanEkstrak[0] as any).id === 99, 'ID pesan harus 99');
      tegaskan((pesanEkstrak[0] as any).result === 'sukses', 'Result harus cocok');
    });

    // 3. Error Recovery pada Permintaan Tidak Dikenal
    const server = new ServerBahasaNUSANTARA();
    const resTakDikenal: any = await server.tanganiPesan({
      jsonrpc: '2.0',
      id: 100,
      method: 'metode/khayalan',
      params: {},
    });

    uji('Menolak metode tak dikenal dengan kode MethodNotFound (-32601) tanpa crash', () => {
      tegaskan(resTakDikenal.error !== undefined, 'Harus mengembalikan objek error');
      tegaskan(resTakDikenal.error.code === KodeGalatJSONRPC.MethodNotFound, 'Kode galat harus MethodNotFound');
    });

    // 4. CLI Integrasi nusantara versi (v0.20.0)
    let outputCLI = '';
    const cli = new NusantaraCLI({
      penulisLog: msg => (outputCLI += msg + '\n'),
    });

    const statusVersi = cli.jalankan(['versi']);
    uji('CLI nusantara versi menampilkan target v0.20.0', () => {
      tegaskan(statusVersi === 0, 'Status keluar versi harus 0');
      tegaskan(outputCLI.includes('v0.20.0'), 'Harus memuat teks v0.20.0');
      tegaskan(outputCLI.includes('Language Server'), 'Harus menyebut Language Server');
    });

    // 5. CLI Integrasi nusantara bantuan
    outputCLI = '';
    const statusBantuan = cli.jalankan(['bantuan']);
    uji('CLI nusantara bantuan mendokumentasikan perintah bahasa-server dan lsp', () => {
      tegaskan(statusBantuan === 0, 'Status keluar bantuan harus 0');
      tegaskan(outputCLI.includes('bahasa-server') || outputCLI.includes('lsp'), 'Harus mendokumentasikan bahasa-server / lsp');
    });
  }

  console.log('\n======================================================');
  console.log(`TOTAL UJI: ${totalUji} | BERHASIL: ${ujiBerhasil} | GAGAL: ${ujiGagal}`);
  console.log('======================================================');

  if (ujiGagal > 0) {
    console.error(`[GAGAL] Terdapat ${ujiGagal} pengujian Language Server yang gagal!`);
    process.exit(1);
  } else {
    console.log('[SUKSES] Seluruh pengujian Language Server NUSANTARA (Phase 20) BERHASIL 100%!');
  }
}

jalankanPengujianLSP().catch(err => {
  console.error('Fatal pengujian:', err);
  process.exit(1);
});
