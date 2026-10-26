/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RANGKAIAN PENGUJIAN RESMI SUBSISTEM DEBUGGER & PROFILER NUSANTARA (PHASE 25)
 * Memvalidasi: Source Location Tracking, Breakpoint Foundation & Validation,
 * Stepping Execution (Step In/Over/Out, Continue), Variable Inspection,
 * Call Stack Navigation, Watch Expressions, Conditional Breakpoints,
 * Runtime Error Diagnostics, High-Resolution Monotonic Profiler, Self-Time,
 * Debug Adapter Protocol (DAP), dan Integrasi CLI.
 */

import { PenelusurNUSANTARA } from '../../src/debugger/penelusur';
import { PengelolaBreakpoint } from '../../src/debugger/breakpointManager';
import { ProfilerNUSANTARA } from '../../src/debugger/profiler';
import { AdapterDAPNUSANTARA } from '../../src/debugger/adapterDAP';
import { PelariDebuggerCLI, PelariProfilerCLI } from '../../src/debugger/cliDebugger';
import { NusantaraCLI } from '../../src/paket/cli';
import { PembacaBerkasMemori } from '../../src/modul';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import {
  VERSI_NUSANTARA,
  LABEL_VERSI_NUSANTARA,
  FASE_TERAKHIR,
  NAMA_FASE_TERAKHIR,
  dapatkanBannerCLI,
} from '../../src/konstanta/versi';

console.log('=============================================================================');
console.log('PENGUJIAN DEBUGGER & PROFILER RUNTIME BAHASA NUSANTARA (PHASE 25)');
console.log(`Target Milestone: ${LABEL_VERSI_NUSANTARA}`);
console.log('=============================================================================\n');

let totalUji = 0;
let lulusUji = 0;
let gagalUji = 0;

function pastikan(kondisi: boolean, pesan: string): void {
  totalUji++;
  if (kondisi) {
    lulusUji++;
    console.log(`  [✓ LULUS] ${pesan}`);
  } else {
    gagalUji++;
    console.error(`  [✗ GAGAL] ${pesan}`);
  }
}

// ============================================================================
// GRUP 1: BREAKPOINT FOUNDATION & VALIDATION
// ============================================================================
console.log('=== [GRUP 1: Titik Henti (Breakpoint Foundation & Validation)] ===');

const programSederhana = `program UjiBreakpoint
mulai
    // Baris 3: Komentar
    x : bilangan = 10
    y : bilangan = 20
    z : bilangan = x + y
    tampilkan("Hasil:", z)
selesai`;

const debuggerEngine = new PenelusurNUSANTARA();
const sesi1 = debuggerEngine.buatSesi({ berkas: 'uji.nusantara', sumber: programSederhana });

// 1.1 Breakpoint valid pada baris pernyataan
const bpValid = sesi1.tambahBreakpoint(4);
pastikan(
  bpValid.validasi.valid === true && bpValid.breakpoint.baris === 4 && bpValid.breakpoint.id === 1,
  '1.1 Breakpoint valid pada baris pernyataan yang dapat dieksekusi (baris 4)'
);

// 1.2 Breakpoint pada baris tidak valid ditolak tanpa crash & menyarankan baris terdekat
const bpTidakValid = sesi1.tambahBreakpoint(3); // Baris 3 adalah komentar
pastikan(
  bpTidakValid.validasi.valid === false &&
    bpTidakValid.validasi.pesan.includes('Breakpoint tidak dapat ditempatkan') &&
    bpTidakValid.validasi.barisDiusulkan === 4,
  '1.2 Breakpoint pada komentar/baris kosong ditolak dan menawarkan baris terdekat (baris 4)'
);

// 1.3 Breakpoint hit counter bertambah setiap kali lokasi tercapai
let hitCount = 0;
debuggerEngine.pasangPenanganJeda((s, alasan) => {
  if (alasan === 'breakpoint') hitCount++;
  return 'continue';
});
debuggerEngine.jalankan(sesi1);
pastikan(
  hitCount === 1 && bpValid.breakpoint.jumlahHit === 1,
  '1.3 Hit counter breakpoint bertambah dengan benar saat lokasi tercapai'
);

// 1.4 Hapus breakpoint & status non-aktif
const idHapus = bpValid.breakpoint.id;
const hasilHapus = sesi1.hapusBreakpoint(idHapus);
pastikan(
  hasilHapus === true && sesi1.pengelolaBreakpoint.dapatkanBerdasarkanId(idHapus) === undefined,
  '1.4 Hapus breakpoint berhasil dan menghapus dari registrasi sesi'
);

// 1.5 Breakpoint sementara (temporary) otomatis terhapus setelah hit
const sesiTemp = debuggerEngine.buatSesi({ berkas: 'temp.nusantara', sumber: programSederhana });
const bpTemp = sesiTemp.tambahBreakpoint(4, { sementara: true });
debuggerEngine.pasangPenanganJeda(() => 'continue');
debuggerEngine.jalankan(sesiTemp);
pastikan(
  sesiTemp.pengelolaBreakpoint.dapatkanBerdasarkanId(bpTemp.breakpoint.id) === undefined,
  '1.5 Breakpoint sementara (temporary) otomatis terhapus setelah pertama kali tercapai'
);

// ============================================================================
// GRUP 2: STEPPING EXECUTION (STEP IN, STEP OVER, STEP OUT, CONTINUE)
// ============================================================================
console.log('\n=== [GRUP 2: Kendali Langkah Eksekusi (Stepping Execution)] ===');

const programFungsi = `program UjiLangkah

fungsi kaliDua(n: bilangan) : bilangan
mulai
    hasil : bilangan = n * 2
    kembalikan hasil
selesai

mulai
    a : bilangan = 5
    b : bilangan = kaliDua(a)
    c : bilangan = b + 1
selesai`;

// 2.1 Continue melanjutkan hingga breakpoint berikutnya
debuggerEngine.bersihkanBreakpoint();
const sesiLanjut = debuggerEngine.buatSesi({ berkas: 'lanjut.nusantara', sumber: programFungsi });
sesiLanjut.tambahBreakpoint(10); // a = 5
sesiLanjut.tambahBreakpoint(12); // c = b + 1
const jejakBarisJeda: number[] = [];
debuggerEngine.pasangPenanganJeda((s) => {
  jejakBarisJeda.push(s.barisSaatIni);
  return 'continue';
});
debuggerEngine.jalankan(sesiLanjut);
pastikan(
  jejakBarisJeda.length === 2 && jejakBarisJeda[0] === 10 && jejakBarisJeda[1] === 12,
  '2.1 Continue melanjutkan eksekusi secara tepat antar-breakpoint'
);

// 2.2 Step-into (langkah masuk ke dalam fungsi)
debuggerEngine.bersihkanBreakpoint();
const sesiStepIn = debuggerEngine.buatSesi({ berkas: 'stepin.nusantara', sumber: programFungsi });
sesiStepIn.tambahBreakpoint(11); // b = kaliDua(a)
const jejakStep = { masukKeDalamFungsi: false };
debuggerEngine.pasangPenanganJeda((s, alasan) => {
  if (s.barisSaatIni === 11) {
    return 'step_into';
  }
  if (s.barisSaatIni === 5) { // Baris di dalam fungsi kaliDua
    jejakStep.masukKeDalamFungsi = true;
  }
  return 'continue';
});
debuggerEngine.jalankan(sesiStepIn);
pastikan(
  jejakStep.masukKeDalamFungsi === true,
  '2.2 Step-into (langkah) melangkah masuk ke dalam tubuh fungsi pemanggil'
);

// 2.3 Step-over (langkah lewati pemanggilan fungsi)
debuggerEngine.bersihkanBreakpoint();
const sesiStepOver = debuggerEngine.buatSesi({ berkas: 'stepover.nusantara', sumber: programFungsi });
sesiStepOver.tambahBreakpoint(11); // b = kaliDua(a)
let barisSetelahStepOver = 0;
debuggerEngine.pasangPenanganJeda((s) => {
  if (s.barisSaatIni === 11) {
    return 'step_over';
  }
  barisSetelahStepOver = s.barisSaatIni;
  return 'continue';
});
debuggerEngine.jalankan(sesiStepOver);
pastikan(
  barisSetelahStepOver === 12,
  '2.3 Step-over (lewati) mengeksekusi fungsi tanpa berhenti di dalamnya hingga kembali ke baris 12'
);

// 2.4 Step-out (langkah keluar dari fungsi saat ini)
debuggerEngine.bersihkanBreakpoint();
const sesiStepOut = debuggerEngine.buatSesi({ berkas: 'stepout.nusantara', sumber: programFungsi });
sesiStepOut.tambahBreakpoint(5); // Di dalam kaliDua
let barisSetelahStepOut = 0;
debuggerEngine.pasangPenanganJeda((s) => {
  if (s.barisSaatIni === 5) {
    return 'step_out';
  }
  barisSetelahStepOut = s.barisSaatIni;
  return 'continue';
});
debuggerEngine.jalankan(sesiStepOut);
pastikan(
  barisSetelahStepOut === 12,
  '2.4 Step-out (keluar-fungsi) menyelesaikan fungsi saat ini dan berhenti pada pemanggil'
);

// ============================================================================
// GRUP 3: VARIABLE INSPECTION & SCOPES
// ============================================================================
console.log('\n=== [GRUP 3: Inspeksi Variabel & Lingkup (Variable Inspection)] ===');

const programVariabel = `program UjiVariabel
mulai
    nama : teks = "NUSANTARA"
    umur : bilangan = 20
    aktif : logika = benar
    tetap PI : desimal = 3.14
    daftarAngka : daftar = [1, 2, 3]
    tampilkan("Selesai")
selesai`;

debuggerEngine.bersihkanBreakpoint();
const sesiVar = debuggerEngine.buatSesi({ berkas: 'var.nusantara', sumber: programVariabel });
sesiVar.tambahBreakpoint(8); // Di baris tampilkan("Selesai")
debuggerEngine.pasangPenanganJeda((s) => {
  const vars = s.dapatkanVariabelLokal();
  pastikan(
    vars.has('nama') && (vars.get('nama')?.nilai as any)?.nilai === 'NUSANTARA',
    '3.1 Variabel teks dapat diinspeksi dengan nilai dan tipe yang tepat'
  );
  pastikan(
    vars.has('umur') && vars.get('umur')?.formatTeks === '20',
    '3.2 Variabel bilangan dapat diinspeksi dengan benar'
  );
  pastikan(
    vars.has('aktif') && vars.get('aktif')?.formatTeks === 'benar',
    '3.3 Variabel logika bernilai benar terdeteksi'
  );
  pastikan(
    vars.has('PI') && vars.get('PI')?.tetap === true,
    '3.4 Status konstanta (tetap) teridentifikasi pada variabel PI'
  );
  pastikan(
    vars.has('daftarAngka') && vars.get('daftarAngka')?.tipe === 'daftar',
    '3.5 Variabel koleksi daftar terdeteksi tipenya'
  );
  return 'continue';
});
debuggerEngine.jalankan(sesiVar);

// ============================================================================
// GRUP 4: CALL STACK & FRAME SELECTION
// ============================================================================
console.log('\n=== [GRUP 4: Navigasi Tumpukan Panggilan (Call Stack & Frames)] ===');

const programRekursif = `program UjiRekursi

fungsi f_tiga(val: bilangan) : bilangan
mulai
    kembalikan val + 10
selesai

fungsi f_dua(val: bilangan) : bilangan
mulai
    res : bilangan = f_tiga(val * 2)
    kembalikan res
selesai

mulai
    masukan : bilangan = 5
    akhir : bilangan = f_dua(masukan)
selesai`;

debuggerEngine.bersihkanBreakpoint();
const sesiStack = debuggerEngine.buatSesi({ berkas: 'stack.nusantara', sumber: programRekursif });
sesiStack.tambahBreakpoint(5); // Di dalam f_tiga
debuggerEngine.pasangPenanganJeda((s) => {
  const stack = s.tumpukanBingkai;
  pastikan(
    stack.length >= 3,
    `4.1 Tumpukan panggilan (call stack) mencatat 3 level frame bersarang (Aktual: ${stack.length})`
  );
  pastikan(
    stack[0].namaFungsi.includes('f_tiga'),
    '4.2 Frame #0 menunjuk ke fungsi teratas f_tiga'
  );

  // 4.3 Pemilihan frame (frame selection)
  const suksesPilih = s.pilihBingkai(1);
  const bingkaiAktif = s.dapatkanBingkaiAktif();
  pastikan(
    Boolean(suksesPilih && bingkaiAktif?.namaFungsi.includes('f_dua')),
    '4.3 Pemilihan frame beralih konteks ke f_dua (Frame #1)'
  );
  return 'continue';
});
debuggerEngine.jalankan(sesiStack);

// ============================================================================
// GRUP 5: WATCH EXPRESSIONS & DYNAMIC EVALUATION
// ============================================================================
console.log('\n=== [GRUP 5: Ekspresi Pantau (Watch Expressions) & Evaluasi Dinamis] ===');

const programWatch = `program UjiWatch
mulai
    p : bilangan = 10
    q : bilangan = 25
    r : bilangan = p + q
    tampilkan("Selesai")
selesai`;

debuggerEngine.bersihkanBreakpoint();
const sesiWatch = debuggerEngine.buatSesi({ berkas: 'watch.nusantara', sumber: programWatch });
sesiWatch.tambahBreakpoint(6); // Di baris tampilkan("Selesai")
const pantau1 = sesiWatch.tambahPantau('p + q');
const pantau2 = sesiWatch.tambahPantau('p * 2');
const pantauGalat = sesiWatch.tambahPantau('variabel_fiktif + 1');

debuggerEngine.pasangPenanganJeda((s) => {
  pastikan(
    pantau1.status === 'sukses' && pantau1.nilai === '35',
    '5.1 Watch expression berhasil mengevaluasi penjumlahan variabel p + q = 35'
  );
  pastikan(
    pantau2.status === 'sukses' && pantau2.nilai === '20',
    '5.2 Watch expression perkalian p * 2 = 20 berhasil dievaluasi'
  );
  pastikan(
    pantauGalat.status === 'galat' && pantauGalat.galat !== undefined,
    '5.3 Watch expression dengan variabel tidak terdefinisi menghasilkan status galat secara aman'
  );

  // Evaluasi dinamis interaktif
  const evalDinamis = s.evaluasiEkspresi('q - p');
  pastikan(
    evalDinamis.berhasil && evalDinamis.formatTeks === '15',
    '5.4 Evaluasi ekspresi dinamis (print) q - p menghasilkan 15'
  );
  return 'continue';
});
debuggerEngine.jalankan(sesiWatch);

// ============================================================================
// GRUP 6: CONDITIONAL BREAKPOINTS & ERROR DEBUGGING
// ============================================================================
console.log('\n=== [GRUP 6: Breakpoint Kondisional & Error Debugging] ===');

const programLoopKondisi = `program UjiLoopKondisi
mulai
    k : bilangan = 1
    selama k <= 10 lakukan
        k = k + 1
    akhir
selesai`;

debuggerEngine.bersihkanBreakpoint();
const sesiKondisi = debuggerEngine.buatSesi({ berkas: 'kondisi.nusantara', sumber: programLoopKondisi });
// Pasang breakpoint pada baris 5 hanya jika k == 5
sesiKondisi.tambahBreakpoint(5, { kondisi: 'k == 5' });
let hitNilaiK = 0;
debuggerEngine.pasangPenanganJeda((s) => {
  const vars = s.dapatkanVariabelLokal();
  hitNilaiK = Number(vars.get('k')?.formatTeks || 0);
  return 'continue';
});
debuggerEngine.jalankan(sesiKondisi);
pastikan(
  hitNilaiK === 5,
  '6.1 Conditional breakpoint hanya menjeda program saat ekspresi kondisi terpenuhi (k == 5)'
);

// 6.2 Error Debugging & Post-mortem Inspection
const programGalat = `program UjiGalat
mulai
    pembagi : bilangan = 0
    hasil : bilangan = 100 / pembagi
selesai`;

debuggerEngine.bersihkanBreakpoint();
const sesiGalat = debuggerEngine.buatSesi({ berkas: 'galat.nusantara', sumber: programGalat });
const jejakGalat = { tertangkap: false };
debuggerEngine.pasangPenanganJeda((s, alasan) => {
  if (alasan === 'galat_runtime') {
    jejakGalat.tertangkap = true;
    pastikan(
      s.galatTerakhir !== undefined && s.galatTerakhir.message.includes('nol'),
      '6.2 Debugger menangkap galat runtime pembagian nol dan mempertahankan status galat'
    );
  }
  return 'continue';
});
debuggerEngine.jalankan(sesiGalat);
pastikan(
  jejakGalat.tertangkap === true && sesiGalat.status === 'failed',
  '6.3 Status sesi debug beralih ke failed saat terjadi unhandled runtime error'
);

// ============================================================================
// GRUP 7: PROFILER RUNTIME & EXECUTION TIMING
// ============================================================================
console.log('\n=== [GRUP 7: Pengukur Kinerja Eksekusi (Profiler Runtime)] ===');

const profiler = new ProfilerNUSANTARA(true);
profiler.aktifkan('uji_profiler.nusantara');

// Simulasi fungsi rekursif A -> B
profiler.mulaiPanggilan('fungsi_utama');
for (let i = 0; i < 5; i++) {
  profiler.mulaiPanggilan('sub_tugas');
  // Kerja mikro
  for (let j = 0; j < 1000; j++) {}
  profiler.selesaiPanggilan('sub_tugas');
}
profiler.selesaiPanggilan('fungsi_utama');

const laporan = profiler.buatLaporan('uji_profiler.nusantara');

pastikan(
  laporan.daftarFungsi.length === 2,
  '7.1 Profiler mencatat kedua fungsi yang dieksekusi'
);

const entriSub = laporan.daftarFungsi.find(f => f.namaFungsi === 'sub_tugas');
const entriUtama = laporan.daftarFungsi.find(f => f.namaFungsi === 'fungsi_utama');

pastikan(
  entriSub !== undefined && entriSub.jumlahPanggilan === 5,
  '7.2 Jumlah pemanggilan sub_tugas tercatat tepat 5 kali'
);

pastikan(
  entriUtama !== undefined && entriUtama.waktuTotalMs >= entriSub!.waktuTotalMs,
  '7.3 Waktu total fungsi pemanggil lebih besar atau sama dengan sub-fungsi anak'
);

pastikan(
  laporan.memori.didukung === true && typeof laporan.memori.formatTeks === 'string',
  '7.4 Statistik memori runtime terbaca dan terformat dengan benar'
);

const formatKonsol = ProfilerNUSANTARA.formatTabelKonsol(laporan);
pastikan(
  formatKonsol.includes('LAPORAN PROFILER') && formatKonsol.includes('sub_tugas'),
  '7.5 Format tabel konsol profiler memuat header dan daftar fungsi'
);

const formatJson = ProfilerNUSANTARA.formatJSON(laporan);
pastikan(
  formatJson.includes('"namaProgram"') && formatJson.includes('"daftarFungsi"'),
  '7.6 Format JSON laporan profiler menghasilkan schema data terstruktur'
);

// 7.7 Profiler off by default
const profilerPasif = new ProfilerNUSANTARA(false);
pastikan(
  profilerPasif.apakahAktif() === false,
  '7.7 Profiler non-aktif secara default (overhead nol)'
);

// ============================================================================
// GRUP 8: DEBUG ADAPTER PROTOCOL (DAP)
// ============================================================================
console.log('\n=== [GRUP 8: Debug Adapter Protocol (DAP) Foundation] ===');

const adapterDAP = new AdapterDAPNUSANTARA();

// 8.1 initialize
const resInit = adapterDAP.prosesPermintaan({
  seq: 1,
  type: 'request',
  command: 'initialize',
});
pastikan(
  resInit.success === true && resInit.body.supportsConditionalBreakpoints === true,
  '8.1 DAP initialize merespon dengan daftar kemampuan (capabilities) yang valid'
);

// 8.2 launch
const resLaunch = adapterDAP.prosesPermintaan({
  seq: 2,
  type: 'request',
  command: 'launch',
  arguments: {
    program: 'dap_test.nusantara',
    sumber: programSederhana,
  },
});
pastikan(
  resLaunch.success === true && resLaunch.body.status === 'created',
  '8.2 DAP launch menginisialisasi sesi debug baru'
);

// 8.3 setBreakpoints
const resBP = adapterDAP.prosesPermintaan({
  seq: 3,
  type: 'request',
  command: 'setBreakpoints',
  arguments: {
    source: { path: 'dap_test.nusantara' },
    breakpoints: [{ line: 4 }],
  },
});
pastikan(
  resBP.success === true && resBP.body.breakpoints.length === 1 && resBP.body.breakpoints[0].verified === true,
  '8.3 DAP setBreakpoints memvalidasi dan mengembalikan status titik henti'
);

// 8.4 scopes & variables
const resScopes = adapterDAP.prosesPermintaan({
  seq: 4,
  type: 'request',
  command: 'scopes',
  arguments: { frameId: 0 },
});
pastikan(
  resScopes.success === true && resScopes.body.scopes.length === 2,
  '8.4 DAP scopes mengembalikan lingkup Locals dan Globals'
);

// 8.5 evaluate & disconnect
const resEval = adapterDAP.prosesPermintaan({
  seq: 5,
  type: 'request',
  command: 'evaluate',
  arguments: { expression: '10 + 20' },
});
pastikan(
  resEval.success === true && resEval.body.result === '30',
  '8.5 DAP evaluate menghitung ekspresi dinamis via DAP protocol'
);

const resDisc = adapterDAP.prosesPermintaan({
  seq: 6,
  type: 'request',
  command: 'disconnect',
});
pastikan(
  resDisc.success === true,
  '8.6 DAP disconnect menutup sesi penelusuran'
);

// ============================================================================
// GRUP 9: INTEGRASI CLI (nusantara debug & nusantara profil)
// ============================================================================
console.log('\n=== [GRUP 9: Integrasi CLI NUSANTARA (Phase 25)] ===');

const logKeluaran: string[] = [];
const errKeluaran: string[] = [];
const memoriFS = new PembacaBerkasMemori({
  'program_cli.nusantara': programSederhana,
  'program_profil.nusantara': programFungsi,
});

const cli = new NusantaraCLI({
  pembaca: memoriFS,
  penulisLog: (m) => logKeluaran.push(m),
  penulisGalat: (m) => errKeluaran.push(m),
});

// 9.1 Banner CLI menyertakan v0.25.0 dan Debugger & Profiler
const banner = dapatkanBannerCLI();
pastikan(
  banner.includes(LABEL_VERSI_NUSANTARA) && banner.includes('Debugger & Profiler'),
  '9.1 Banner CLI menyertakan versi v0.25.0 dan subsistem Debugger & Profiler'
);

// 9.2 CLI nusantara debug dengan perintah batch
logKeluaran.length = 0;
const kodeDebug = cli.jalankan(['debug', 'program_cli.nusantara', '--perintah=break 4; continue; print x; quit']);
pastikan(
  kodeDebug === 0 && logKeluaran.some(l => l.includes('NUSANTARA Debugger')),
  '9.2 CLI "nusantara debug" mengeksekusi sesi penelusuran batch dengan sukses'
);

// 9.3 CLI nusantara profil
logKeluaran.length = 0;
const kodeProfil = cli.jalankan(['profil', 'program_profil.nusantara']);
pastikan(
  kodeProfil === 0 && logKeluaran.some(l => l.includes('LAPORAN PROFILER')),
  '9.3 CLI "nusantara profil" menjalankan program dan mencetak tabel profil performa'
);

// 9.4 CLI nusantara info menampilkan Phase 25
logKeluaran.length = 0;
cli.jalankan(['info']);
pastikan(
  logKeluaran.some(l => l.includes(String(FASE_TERAKHIR)) || l.includes('v0.25.0')),
  '9.4 CLI "nusantara info" menampilkan informasi Phase 25'
);

// ============================================================================
// GRUP 10: REGRESI PHASE 1–24
// ============================================================================
console.log('\n=== [GRUP 10: Regresi Fitur Phase 1–24] ===');

const bufferRegresi = new PenulisOutputBuffer();
const interpRegresi = new Interpreter(bufferRegresi);
const programRegresi = `program DemoRegresi
mulai
    daftarPesan : daftar = ["Halo", "Dunia", "NUSANTARA"]
    tampilkan("Elemen ke-2:", daftarPesan[2])
    panjangDaftar : bilangan = panjang(daftarPesan)
    tampilkan("Panjang:", panjangDaftar)
selesai`;

interpRegresi.jalankanKode(programRegresi);
const outRegresi = bufferRegresi.dapatkanSeluruhTeks();

pastikan(
  outRegresi.some((o: string) => o.includes('NUSANTARA')) && outRegresi.some((o: string) => o.includes('3')),
  '10.1 Eksekusi program AST, struktur data daftar, dan built-in function tetap bekerja 100%'
);

// Single Source of Truth
pastikan(
  (VERSI_NUSANTARA as string) >= '0.25.0' && (FASE_TERAKHIR as number) >= 25,
  '10.2 Single Source of Truth versi terkonsolidasi pada v0.26.0 (Phase >= 25)'
);

// ============================================================================
// RINGKASAN AKHIR
// ============================================================================
console.log('\n============================================================');
console.log('RINGKASAN PENGUJIAN PHASE 25: DEBUGGER & PROFILER');
console.log(`Total Pengujian : ${totalUji}`);
console.log(`Lulus           : ${lulusUji}`);
console.log(`Gagal           : ${gagalUji}`);
console.log('============================================================');

if (gagalUji === 0) {
  console.log('Seluruh pengujian Phase 25 LULUS DENGAN SEMPURNA! (100% Pass)');
  process.exit(0);
} else {
  console.error(`Terdapat ${gagalUji} pengujian yang GAGAL.`);
  process.exit(1);
}
