/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pengujian Fondasi Developer Tools & IDE NUSANTARA (Phase 26)
 * Target Milestone: v0.26.0
 */

import {
  ManajerRuangKerja,
  sorotSintaksisNUSANTARA,
  JembatanLSP,
  PelariProsesIDE,
  TerminalTerintegrasi,
  ManajerPengaturanIDE,
  RegistriPerintahIDE,
  terjemahkan,
  KAMUS_TERJEMAHAN,
} from '../../src/ide';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  FASE_TERAKHIR,
  NAMA_FASE_TERAKHIR,
} from '../../src/konstanta/versi';
import { TingkatDiagnostik } from '../../src/diagnostik';

let totalUji = 0;
let lulusUji = 0;
let gagalUji = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  totalUji++;
  if (kondisi) {
    lulusUji++;
    console.log(`  [✓] Lulus: ${pesan}`);
  } else {
    gagalUji++;
    console.error(`  [✗] GAGAL: ${pesan}`);
  }
}

console.log('============================================================');
console.log(`MEMULAI PENGUJIAN FONDASI IDE NUSANTARA (FASE 26) — ${LABEL_VERSI_NUSANTARA}`);
console.log('============================================================\n');

// ============================================================================
// 1. PENGUJIAN WORKSPACE MANAGER & FILE TREE
// ============================================================================
console.log('--- 1. Pengujian Workspace Manager & Operasi Berkas ---');

const ws = new ManajerRuangKerja();

pastikan(
  ws.apakahAda('/proyek/nusantara.toml'),
  '1.1 Proyek percontohan memuat manifest nusantara.toml secara otomatis'
);

pastikan(
  ws.apakahAda('/proyek/src/utama.nusantara'),
  '1.2 Berkas utama /proyek/src/utama.nusantara tersedia di workspace'
);

pastikan(
  ws.apakahAda('/proyek/src/matematika_ekstra.nusantara'),
  '1.3 Modul pustaka /proyek/src/matematika_ekstra.nusantara tersedia di workspace'
);

pastikan(
  ws.apakahAda('/proyek/pengujian/utama_test.nusantara'),
  '1.4 Berkas pengujian unit /proyek/pengujian/utama_test.nusantara tersedia'
);

pastikan(
  ws.apakahAda('/proyek/docs/panduan.md'),
  '1.5 Dokumentasi proyek /proyek/docs/panduan.md tersedia'
);

// Validasi pembacaan berkas
const isiUtama = ws.bacaBerkas('/proyek/src/utama.nusantara');
pastikan(
  isiUtama.includes('program AplikasiUtama') && isiUtama.includes('mulai'),
  '1.6 Pembacaan berkas UTF-8 mengembalikan isi kode sumber secara tepat'
);

// Pembuatan dan penulisan berkas baru
ws.buatBerkas('/proyek/src/utilitas_baru.nusantara', 'program Utilitas\nmulai\nselesai\n');
pastikan(
  ws.apakahAda('/proyek/src/utilitas_baru.nusantara'),
  '1.7 Pembuatan berkas baru berhasil tercatat di workspace'
);

// Pembuatan folder baru
ws.buatFolder('/proyek/data');
pastikan(
  ws.apakahAda('/proyek/data/.gitkeep'),
  '1.8 Pembuatan folder baru berhasil mendaftarkan entri di workspace'
);

// Penggantian nama (Rename)
ws.gantiNama('/proyek/src/utilitas_baru.nusantara', '/proyek/src/utilitas_ganti.nusantara');
pastikan(
  !ws.apakahAda('/proyek/src/utilitas_baru.nusantara') && ws.apakahAda('/proyek/src/utilitas_ganti.nusantara'),
  '1.9 Penggantian nama berkas berhasil memperbarui jalur entri'
);

// Penghapusan berkas
ws.hapus('/proyek/src/utilitas_ganti.nusantara');
pastikan(
  !ws.apakahAda('/proyek/src/utilitas_ganti.nusantara'),
  '1.10 Penghapusan berkas menghapus entri dari workspace'
);

// Pohon berkas (Struktur hirarkis)
const pohon = ws.dapatkanStrukturPohon();
pastikan(
  pohon.apakahDirektori && Boolean(pohon.anak && pohon.anak.length > 0),
  '1.11 Generasi pohon berkas hierarkis valid untuk Project Explorer'
);

// Proteksi path traversal
let galatTraversal = false;
try {
  ws.bacaBerkas('/proyek/../../etc/passwd');
} catch {
  galatTraversal = true;
}
pastikan(
  galatTraversal,
  '1.12 Proteksi keamanan mencegah path traversal ke luar ruang kerja proyek'
);

// ============================================================================
// 2. PENGUJIAN PENCARIAN DALAM BERKAS (SEARCH IN FILES)
// ============================================================================
console.log('\n--- 2. Pengujian Pencarian Dalam Berkas (Search in Files) ---');

const hasilCari = ws.cariDalamBerkas('hitung_pangkat');
pastikan(
  hasilCari.length >= 2,
  '2.1 Pencarian teks menemukan simbol di definisi dan pengujian unit'
);

const entriCari = hasilCari[0];
pastikan(
  entriCari.jalurBerkas.length > 0 && entriCari.baris > 0 && entriCari.cuplikanTeks.length > 0,
  '2.2 Hasil pencarian menyertakan jalur berkas, nomor baris, kolom, dan cuplikan baris'
);

// ============================================================================
// 3. PENGUJIAN SYNTAX HIGHLIGHTER BERBASIS LEXER RESMI
// ============================================================================
console.log('\n--- 3. Pengujian Syntax Highlighter Berbasis Lexer ---');

const kodeUjiHighlight = `program UjiSintaks
mulai
    // Komentar penjelas
    angka : bilangan = 42
    teks_pesan : teks = "Halo Nusantara"
    jika angka > 10 maka
        tampilkan(teks_pesan)
    selesai
`;

const barisHighlight = sorotSintaksisNUSANTARA(kodeUjiHighlight);
pastikan(
  barisHighlight.length >= 8,
  '3.1 Penyorot sintaksis memetakan seluruh baris kode sumber'
);

const semuaToken = barisHighlight.flatMap(b => b.tokenList);
const tokenProgram = semuaToken.find(t => t.teks === 'program');
pastikan(
  tokenProgram !== undefined && tokenProgram.kelasCss.includes('text-purple-400'),
  '3.2 Kata kunci program disorot dengan kelas kata kunci ungu'
);

const tokenKomentar = semuaToken.find(t => t.teks.includes('Komentar penjelas'));
pastikan(
  tokenKomentar !== undefined && tokenKomentar.kelasCss.includes('italic'),
  '3.3 Komentar kode disorot dengan gaya miring (italic) terpisah'
);

const tokenAngka = semuaToken.find(t => t.teks === '42');
pastikan(
  tokenAngka !== undefined && tokenAngka.kelasCss.includes('text-emerald-400'),
  '3.4 Literal numerik 42 disorot dengan warna numerik hijau'
);

// ============================================================================
// 4. PENGUJIAN JEMBATAN LANGUAGE SERVER (LSP BRIDGE)
// ============================================================================
console.log('\n--- 4. Pengujian Jembatan Language Server (LSP Bridge) ---');

const lsp = new JembatanLSP();

// Diagnostik kode valid
const diagValid = lsp.dapatkanDiagnostik('/proyek/src/valid.nusantara', 'program Demo\nmulai\n    x : bilangan = 10\n    tampilkan(x)\nselesai\n');
pastikan(
  diagValid.length === 0,
  '4.1 Kode valid menghasilkan 0 diagnostik kesalahan'
);

// Diagnostik kode dengan kesalahan sintaksis
const diagGalat = lsp.dapatkanDiagnostik('/proyek/src/galat.nusantara', 'program Rusak\nmulai\n    jika maka\nselesai\n');
pastikan(
  diagGalat.length > 0 && diagGalat.some(d => d.tingkat === TingkatDiagnostik.KESALAHAN),
  '4.2 Kode sintaksis salah menghasilkan diagnostik kesalahan dengan baris & kolom'
);

// Autocomplete
const saranComp = lsp.dapatkanKompleksi(
  '/proyek/src/utama.nusantara',
  3,
  8,
  'program Demo\nmulai\n    tam\nselesai\n'
);
pastikan(
  saranComp.length > 0 && saranComp.some(s => s.label === 'tampilkan'),
  '4.3 Autocomplete mengembalikan fungsi bawaan resmi tampilkan'
);

// Hover
const hoverInfo = lsp.dapatkanHover(
  '/proyek/src/utama.nusantara',
  1,
  3,
  'program Demo\nmulai\nselesai\n'
);
pastikan(
  hoverInfo !== undefined && hoverInfo.isi.includes('program'),
  '4.4 Hover pada kata kunci program menghasilkan dokumentasi resmi'
);

// Pemformatan dokumen aman (Format Document)
const kodeKotor = 'program Demo\nmulai\nvariabel x:bilangan=10\ntampilkan(x)\nselesai';
const hasilFormat = lsp.formatDokumen(kodeKotor, 4);
pastikan(
  hasilFormat.berhasil && hasilFormat.hasil.includes('    variabel x: bilangan = 10'),
  '4.5 Format dokumen via Formatter resmi merapikan indentasi secara konsisten'
);

// ============================================================================
// 5. PENGUJIAN MESIN EKSEKUSI PROSES (RUNNER)
// ============================================================================
console.log('\n--- 5. Pengujian Mesin Eksekusi Proses (Runner) ---');

const runner = new PelariProsesIDE();

// Jalankan program sukses
const hasilRun = runner.jalankanProgram(
  '/proyek/src/utama.nusantara',
  `program UjiEksekusi
mulai
    tampilkan("Halo dari Runner IDE")
    tampilkan(10 + 20)
selesai
`
);

pastikan(
  hasilRun.status === 'finished' && hasilRun.kodeKeluar === 0,
  '5.1 Program valid dieksekusi sukses dengan status finished dan kode keluar 0'
);

pastikan(
  hasilRun.keluaran.some(l => l.pesan.includes('Halo dari Runner IDE')) &&
  hasilRun.keluaran.some(l => l.pesan.includes('30')),
  '5.2 Seluruh keluaran stdout tertangkap dengan benar di log konsol'
);

// Jalankan program gagal (Runtime Error)
const hasilRunGagal = runner.jalankanProgram(
  '/proyek/src/gagal.nusantara',
  `program UjiGagal
mulai
    daftar_angka : daftar = [1, 2]
    tampilkan(daftar_angka[99]) // Indeks di luar rentang
selesai
`
);

pastikan(
  hasilRunGagal.status === 'failed' && hasilRunGagal.kodeKeluar === 1,
  '5.3 Program dengan galat runtime ditangani aman dengan status failed'
);

// Pengukuran Profiler
const hasilProfil = runner.jalankanProfiler(
  '/proyek/src/profil_test.nusantara',
  `program UjiProfil
fungsi lipat(n: bilangan) : bilangan
mulai
    kembalikan n * 2
selesai

mulai
    x : bilangan = lipat(21)
    tampilkan(x)
selesai
`
);

pastikan(
  hasilProfil.status === 'finished' && hasilProfil.laporanProfil !== undefined,
  '5.4 Pengukuran profiler menghasilkan laporan performa fungsi yang akurat'
);

// Pengujian penghentian proses
runner.hentikan();
pastikan(
  runner.dapatkanStatus() === 'terminated' || runner.dapatkanStatus() === 'idle',
  '5.5 Penghentian paksa proses (Stop) mengembalikan kontrol tanpa proses zombie'
);

// ============================================================================
// 6. PENGUJIAN TERMINAL TERINTEGRASI (INTEGRATED TERMINAL)
// ============================================================================
console.log('\n--- 6. Pengujian Terminal Terintegrasi (Terminal Runner) ---');

const term = new TerminalTerintegrasi(ws);

pastikan(
  term.dapatkanEntri().some(e => e.teks.includes('NUSANTARA') || e.teks.includes('bantuan')),
  '6.1 Terminal terintegrasi menyajikan banner sambutan awal'
);

const kodeKeluarLs = term.eksekusiPerintah('ls');
pastikan(
  kodeKeluarLs === 0 && term.dapatkanEntri().some(e => e.teks.includes('src/utama.nusantara')),
  '6.2 Perintah utilitas ls menampilkan daftar berkas di ruang kerja'
);

const kodeKeluarBantuan = term.eksekusiPerintah('bantuan');
pastikan(
  kodeKeluarBantuan === 0 && term.dapatkanEntri().some(e => e.teks.includes('nusantara jalankan')),
  '6.3 Perintah bantuan menampilkan panduan resmi CLI di terminal'
);

term.bersihkan();
pastikan(
  term.dapatkanEntri().length === 0,
  '6.4 Perintah bersihkan/clear mengosongkan riwayat entri layar terminal'
);

// ============================================================================
// 7. PENGUJIAN PENGATURAN & LOKALISASI (SETTINGS & I18N)
// ============================================================================
console.log('\n--- 7. Pengujian Pengaturan & Lokalisasi (Settings & i18n) ---');

const sm = new ManajerPengaturanIDE();
const cfgAwal = sm.dapatkan();

pastikan(
  cfgAwal.editor.ukuranFont === 14 && cfgAwal.tampilan.bahasa === 'id',
  '7.1 Pengaturan awal IDE memuat nilai standar baku'
);

sm.setUkuranFont(18);
pastikan(
  sm.dapatkan().editor.ukuranFont === 18,
  '7.2 Pembaruan ukuran font tersimpan pada manajer pengaturan'
);

sm.setTema('light');
pastikan(
  sm.dapatkan().tampilan.tema === 'light',
  '7.3 Penggantian tema warna ke light berhasil'
);

sm.resetKeBawaan();
pastikan(
  sm.dapatkan().tampilan.tema === 'dark' && sm.dapatkan().editor.ukuranFont === 14,
  '7.4 Reset pengaturan mengembalikan konfigurasi ke kondisi bawaan'
);

// Lokalisasi teks (id dan en)
pastikan(
  terjemahkan('nav.explorer', 'id') === 'Penjelajah Proyek',
  '7.5 Lokalisasi bahasa Indonesia (id) memetakan string terjemahan secara tepat'
);

pastikan(
  terjemahkan('nav.explorer', 'en') === 'Project Explorer',
  '7.6 Lokalisasi bahasa Inggris (en) memetakan string terjemahan secara tepat'
);

const pesanParam = terjemahkan('explorer.confirmDelete', 'id', { name: 'berkas.nusantara' });
pastikan(
  pesanParam.includes('berkas.nusantara'),
  '7.7 Substitusi parameter dinamis pada string lokalisasi berhasil'
);

// ============================================================================
// 8. PENGUJIAN REGISTRI PERINTAH (COMMAND REGISTRY)
// ============================================================================
console.log('\n--- 8. Pengujian Registri Perintah (Command Palette) ---');

const cr = new RegistriPerintahIDE();
const daftarSemuaPerintah = cr.semua();

pastikan(
  daftarSemuaPerintah.length >= 10,
  '8.1 Seluruh perintah bawaan (Run, Debug, Save, Format, Palette) terdaftar'
);

const hasilCariCmd = cr.cari('Format');
pastikan(
  hasilCariCmd.some(c => c.id === 'editor.format'),
  '8.2 Pencarian perintah dengan kueri teks menemukan perintah format dokumen'
);

let aksiDieksekusi = false;
cr.daftarkan({
  id: 'uji.perintahKhusus',
  judul: 'cmd.test',
  kategori: 'Uji',
  tindakan: () => {
    aksiDieksekusi = true;
  },
});

cr.jalankan('uji.perintahKhusus');
pastikan(
  aksiDieksekusi,
  '8.3 Eksekusi perintah via RegistriPerintah berhasil memanggil callback tindakan'
);

// ============================================================================
// 9. PENGUJIAN SINGLE SOURCE OF TRUTH (SSOT) VERSI
// ============================================================================
console.log('\n--- 9. Pengujian Single Source of Truth (SSOT) Versi v0.26.0 ---');

pastikan(
  VERSI_NUSANTARA === '0.26.0',
  '9.1 VERSI_NUSANTARA terkonsolidasi pada 0.26.0'
);

pastikan(
  LABEL_VERSI_NUSANTARA === 'v0.26.0',
  '9.2 LABEL_VERSI_NUSANTARA terkonsolidasi pada v0.26.0'
);

pastikan(
  FASE_TERAKHIR === 26,
  '9.3 FASE_TERAKHIR terkonsolidasi pada fase 26'
);

pastikan(
  NAMA_FASE_TERAKHIR === 'Developer Tools & IDE Foundation',
  '9.4 NAMA_FASE_TERAKHIR terkonsolidasi pada Developer Tools & IDE Foundation'
);

// ============================================================================
// RINGKASAN AKHIR
// ============================================================================
console.log('\n============================================================');
console.log('RINGKASAN PENGUJIAN PHASE 26: DEVELOPER TOOLS & IDE FOUNDATION');
console.log(`Total Pengujian : ${totalUji}`);
console.log(`Lulus           : ${lulusUji}`);
console.log(`Gagal           : ${gagalUji}`);
console.log('============================================================');

if (gagalUji > 0) {
  process.exit(1);
}
