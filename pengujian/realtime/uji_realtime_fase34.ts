/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rangkaian Pengujian Resmi NUSANTARA WebSocket, Real-Time Events & Background Tasks (Phase 34)
 * Target Milestone: v0.34.0
 */

import {
  BusPeristiwa,
  PengelolaRuang,
  PengelolaKoneksiWebSocket,
  ServerWebSocketNUSANTARA,
  AntreanTugasMemori,
  KebijakanPercobaanUlang,
  PekerjaLatarBelakang,
  PenjadwalTugas,
  buatTugas,
  KoneksiWebSocketNUSANTARA,
} from '../../src/realtime';
import { NusantaraCLI } from '../../src/paket/cli';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { VERSI_NUSANTARA } from '../../src/konstanta/versi';

let totalUji = 0;
let totalLulus = 0;
let totalGagal = 0;

function uji(nama: string, fn: () => void | Promise<void>): void {
  totalUji++;
  try {
    const hasil = fn();
    if (hasil && typeof hasil.then === 'function') {
      hasil
        .then(() => {
          totalLulus++;
          console.log(`  [✓ LULUS] ${nama}`);
        })
        .catch((err: any) => {
          totalGagal++;
          console.error(`  [✗ GAGAL] ${nama}`);
          console.error(`            ${err.message}`);
        });
      return;
    }
    totalLulus++;
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`            ${err.message}`);
  }
}

async function ujiAsync(nama: string, fn: () => Promise<void>): Promise<void> {
  totalUji++;
  try {
    await fn();
    totalLulus++;
    console.log(`  [✓ LULUS] ${nama}`);
  } catch (err: any) {
    totalGagal++;
    console.error(`  [✗ GAGAL] ${nama}`);
    console.error(`            ${err.message}`);
  }
}

function samaDengan<T>(aktual: T, diharapkan: T, pesan?: string): void {
  if (aktual !== diharapkan) {
    throw new Error(
      `${pesan || 'Nilai tidak sama'}: ditemukan '${aktual}', diharapkan '${diharapkan}'`
    );
  }
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(`Penegasan gagal: ${pesan}`);
  }
}

async function jalankanSemuaPengujian() {
  console.log('=============================================================================');
  console.log(`PENGUJIAN WEBSOCKET, REAL-TIME EVENTS & BACKGROUND TASKS (PHASE 34) — ${VERSI_NUSANTARA}`);
  console.log('=============================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. EVENT SYSTEM (BusPeristiwa)
  // ---------------------------------------------------------------------------
  console.log('--- 1. Real-Time Event System (BusPeristiwa) ---');

  uji('Registrasi dan pemanggilan listener sinkron', () => {
    const bus = new BusPeristiwa();
    let terpanggil = false;
    let dataTerima: any = null;

    bus.dengarkan('pengguna.daftar', (ev) => {
      terpanggil = true;
      dataTerima = ev.data;
    });

    bus.terbitkan({
      nama: 'pengguna.daftar',
      data: { username: 'budi', email: 'budi@nusantara.lang' },
      waktu: new Date(),
    });

    pastikan(terpanggil, 'Listener sinkron harus dipanggil');
    samaDengan(dataTerima.username, 'budi', 'Payload event harus sesuai');
  });

  uji('Listener sekali dengar (sekali/once)', () => {
    const bus = new BusPeristiwa();
    let hitungan = 0;

    bus.sekali('notifikasi.dikirim', () => {
      hitungan++;
    });

    bus.terbitkan({ nama: 'notifikasi.dikirim', data: 1, waktu: new Date() });
    bus.terbitkan({ nama: 'notifikasi.dikirim', data: 2, waktu: new Date() });

    samaDengan(hitungan, 1, 'Listener sekali harus dieksekusi tepat 1 kali');
  });

  await ujiAsync('Penerbitan asinkron (terbitkanAsync)', async () => {
    const bus = new BusPeristiwa();
    const urutan: number[] = [];

    bus.dengarkan('tugas.proses', async (ev) => {
      await new Promise((r) => setTimeout(r, 10));
      urutan.push(ev.data);
    });

    await bus.terbitkanAsync({ nama: 'tugas.proses', data: 42, waktu: new Date() });
    samaDengan(urutan.length, 1, 'Event async harus ditunggu hingga selesai');
    samaDengan(urutan[0], 42, 'Data event async harus sesuai');
  });

  uji('Pola Wildcard pada event bus (mis. pesanan.*)', () => {
    const bus = new BusPeristiwa();
    const eventDiterima: string[] = [];

    bus.dengarkan('pesanan.*', (ev) => {
      eventDiterima.push(ev.nama || ev.jenis);
    });

    bus.terbitkan({ nama: 'pesanan.dibuat', data: null, waktu: new Date() });
    bus.terbitkan({ nama: 'pesanan.dibayar', data: null, waktu: new Date() });
    bus.terbitkan({ nama: 'produk.ditambah', data: null, waktu: new Date() });

    samaDengan(eventDiterima.length, 2, 'Wildcard harus menangkap event yang cocok');
    pastikan(eventDiterima.includes('pesanan.dibuat'), 'Harus cocok pesanan.dibuat');
    pastikan(eventDiterima.includes('pesanan.dibayar'), 'Harus cocok pesanan.dibayar');
  });

  uji('Isolasi error: handler yang melempar error tidak menghentikan handler lain', () => {
    const bus = new BusPeristiwa();
    let handler2Berhasil = false;

    bus.dengarkan('uji.error', () => {
      throw new Error('Error sengaja di handler 1');
    });

    bus.dengarkan('uji.error', () => {
      handler2Berhasil = true;
    });

    bus.terbitkan({ nama: 'uji.error', data: {}, waktu: new Date() });
    pastikan(handler2Berhasil, 'Handler kedua harus tetap berjalan meskipun handler pertama error');
  });

  uji('Deduplikasi event dengan id duplikat', () => {
    const bus = new BusPeristiwa({ batasCacheDeduplikasi: 50 });
    let hitungan = 0;

    bus.dengarkan('transaksi.selesai', () => {
      hitungan++;
    });

    const eventUnik = {
      id: 'tx-12345',
      nama: 'transaksi.selesai',
      data: { jumlah: 50000 },
      waktu: new Date(),
    };

    bus.terbitkan(eventUnik);
    bus.terbitkan(eventUnik); // Duplikat
    bus.terbitkan(eventUnik); // Duplikat

    samaDengan(hitungan, 1, 'Event dengan ID yang sama harus dideduplikasi');
  });

  // ---------------------------------------------------------------------------
  // 2. CHANNELS & ROOMS (PengelolaRuang)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Channels & Rooms Management ---');

  function mockKoneksi(id: string, peran: string[] = ['pengguna']): any {
    const terkirim: string[] = [];
    return {
      id,
      status: 'terbuka',
      daftarRuang: new Set<string>(),
      ruang: new Set<string>(),
      terautentikasi: true,
      peran,
      pesanPerDetik: 0,
      terakhirAktif: Date.now(),
      kirim: (data: string | Buffer) => terkirim.push(typeof data === 'string' ? data : data.toString('utf-8')),
      klien: {
        send: (data: string) => terkirim.push(data),
        close: () => {},
        ping: () => {},
        readyState: 1, // OPEN
      },
      terkirimPesan: terkirim,
    };
  }

  uji('Masuk, keluar, dan penyiaran ruang', () => {
    const pengelola = new PengelolaRuang();
    const c1 = mockKoneksi('klien-1');
    const c2 = mockKoneksi('klien-2');
    const c3 = mockKoneksi('klien-3');

    pastikan(pengelola.masukRuang('chat-umum', c1), 'klien-1 harus berhasil masuk');
    pastikan(pengelola.masukRuang('chat-umum', c2), 'klien-2 harus berhasil masuk');
    pastikan(pengelola.masukRuang('ruang-rahasia', c3), 'klien-3 harus berhasil masuk');

    samaDengan(pengelola.jumlahKoneksiDalamRuang('chat-umum'), 2, 'chat-umum harus memiliki 2 koneksi');
    samaDengan(pengelola.jumlahRuangAktif(), 2, 'Harus ada 2 ruang aktif');

    // Broadcast ke chat-umum kecuali sender (c1)
    pengelola.siarkanKeRuang('chat-umum', { topik: 'halo semua' }, 'klien-1');
    samaDengan((c1 as any).terkirimPesan.length, 0, 'Sender c1 tidak boleh menerima siaran kembali');
    samaDengan((c2 as any).terkirimPesan.length, 1, 'c2 harus menerima siaran');
    samaDengan((c3 as any).terkirimPesan.length, 0, 'c3 di ruang lain tidak boleh menerima');

    // Keluar ruang
    pengelola.keluarRuang('chat-umum', 'klien-1');
    samaDengan(pengelola.jumlahKoneksiDalamRuang('chat-umum'), 1, 'Tersisa 1 di chat-umum');

    pengelola.keluarRuang('chat-umum', 'klien-2');
    samaDengan(pengelola.jumlahKoneksiDalamRuang('chat-umum'), 0, 'chat-umum kosong');
    samaDengan(pengelola.jumlahRuangAktif(), 1, 'chat-umum harus otomatis dibersihkan');
  });

  uji('Otorisasi masuk ruang berbasis hook / peran', () => {
    const pengelola = new PengelolaRuang();
    // Tetapkan hook: hanya peran admin yang boleh masuk ruang dengan prefix 'admin-'
    pengelola.tetapkanHookOtorisasi((namaRuang, koneksi) => {
      if (namaRuang.startsWith('admin-')) {
        return koneksi.peran.includes('admin');
      }
      return true;
    });

    const userBiasa = mockKoneksi('user-1', ['user']);
    const userAdmin = mockKoneksi('admin-1', ['admin']);

    pastikan(!pengelola.masukRuang('admin-dashboard', userBiasa), 'User biasa harus ditolak masuk admin-dashboard');
    pastikan(pengelola.masukRuang('admin-dashboard', userAdmin), 'Admin harus diizinkan masuk');
    samaDengan(pengelola.jumlahKoneksiDalamRuang('admin-dashboard'), 1, 'Hanya admin yang terdaftar');
  });

  // ---------------------------------------------------------------------------
  // 3. WEBSOCKET SERVER & CONNECTION MANAGER
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. WebSocket Connection Management & Security ---');

  uji('Pengelola koneksi dan pembatasan laju pesan (Rate Limit)', () => {
    const pengelolaKoneksi = new PengelolaKoneksiWebSocket({
      maksPesanPerMenit: 3,
    });

    const conn = mockKoneksi('rate-test');
    pengelolaKoneksi.tambahKoneksi(conn);

    pastikan(pengelolaKoneksi.verifikasiLajuPesan('rate-test'), 'Pesan 1 harus lolos');
    pastikan(pengelolaKoneksi.verifikasiLajuPesan('rate-test'), 'Pesan 2 harus lolos');
    pastikan(pengelolaKoneksi.verifikasiLajuPesan('rate-test'), 'Pesan 3 harus lolos');
    pastikan(!pengelolaKoneksi.verifikasiLajuPesan('rate-test'), 'Pesan 4 harus melanggar rate limit');
  });

  uji('Konfigurasi keamanan WebSocket (Origin checking dan Message Size)', () => {
    const serverWs = new ServerWebSocketNUSANTARA({
      port: 9876,
      maksUkuranPesanByte: 1024,
      originDiizinkan: ['https://nusantara.lang', 'http://localhost:3000'],
      otentikasiWajib: true,
    });

    pastikan(serverWs.validasiOrigin('https://nusantara.lang'), 'Origin diizinkan harus valid');
    pastikan(!serverWs.validasiOrigin('https://malicious.site.com'), 'Origin asing harus ditolak');
    pastikan(serverWs.validasiUkuranPesan(500), 'Ukuran 500 byte harus valid');
    pastikan(!serverWs.validasiUkuranPesan(2048), 'Ukuran 2048 byte harus melebihi batas 1024');
  });

  // ---------------------------------------------------------------------------
  // 4. BACKGROUND TASK & QUEUE (AntreanTugas, KebijakanPercobaanUlang)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Background Task Queue & Deduplication ---');

  uji('Siklus hidup tugas latar belakang', () => {
    const tugas = buatTugas('kirim_email', { penerima: 'andi@nusantara.lang' }, { prioritas: 10 });
    samaDengan(tugas.tipe, 'kirim_email', 'Tipe tugas harus sesuai');
    samaDengan(tugas.status, 'antre', 'Status awal harus antre');
    samaDengan(tugas.prioritas, 10, 'Prioritas harus sesuai');
  });

  uji('Pengurutan antrean berbasis prioritas dan FIFO', () => {
    const antrean = new AntreanTugasMemori({ kapasitasMaksimum: 100 });

    const tRendah = buatTugas('tugas_rendah', {}, { prioritas: 1 });
    const tTinggi = buatTugas('tugas_tinggi', {}, { prioritas: 10 });
    const tSedang = buatTugas('tugas_sedang', {}, { prioritas: 5 });

    antrean.tambah(tRendah);
    antrean.tambah(tTinggi);
    antrean.tambah(tSedang);

    samaDengan(antrean.panjang(), 3, 'Panjang antrean harus 3');

    const pertama = antrean.ambil();
    samaDengan(pertama?.id, tTinggi.id, 'Tugas prioritas 10 harus diambil pertama');

    const kedua = antrean.ambil();
    samaDengan(kedua?.id, tSedang.id, 'Tugas prioritas 5 harus diambil kedua');

    const ketiga = antrean.ambil();
    samaDengan(ketiga?.id, tRendah.id, 'Tugas prioritas 1 harus diambil terakhir');
  });

  uji('Deduplikasi tugas menggunakan kunci idempoten (idempotency key)', () => {
    const antrean = new AntreanTugasMemori();

    const t1 = buatTugas('cetak_laporan', { bulan: 'Januari' }, { kunciIdempoten: 'laporan-jan-2026' });
    const t2 = buatTugas('cetak_laporan', { bulan: 'Januari' }, { kunciIdempoten: 'laporan-jan-2026' });

    const hasil1 = antrean.tambah(t1);
    const hasil2 = antrean.tambah(t2);

    pastikan(hasil1, 'Tugas pertama harus berhasil dimasukkan');
    pastikan(!hasil2, 'Tugas duplikat dengan kunci idempoten sama harus ditolak');
    samaDengan(antrean.panjang(), 1, 'Antrean hanya boleh menyimpan 1 tugas');
  });

  uji('Batas kapasitas maksimum antrean', () => {
    const antrean = new AntreanTugasMemori({ kapasitasMaksimum: 2 });

    pastikan(antrean.tambah(buatTugas('t1', {})), 't1 masuk');
    pastikan(antrean.tambah(buatTugas('t2', {})), 't2 masuk');
    pastikan(!antrean.tambah(buatTugas('t3', {})), 't3 harus ditolak karena melebihi kapasitas');
    samaDengan(antrean.panjang(), 2, 'Kapasitas harus tertahan pada 2');
  });

  // ---------------------------------------------------------------------------
  // 5. WORKER & RETRY POLICY (PekerjaLatarBelakang & KebijakanPercobaanUlang)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Background Worker & Retry Backoff ---');

  await ujiAsync('Pekerja memproses tugas sukses', async () => {
    const antrean = new AntreanTugasMemori();
    const pekerja = new PekerjaLatarBelakang({ antrean });

    let diproses = false;
    pekerja.daftarkanHandler('sinkronkan_data', async (tugas) => {
      diproses = true;
      samaDengan(tugas.payload.entitas, 'pengguna');
    });

    antrean.tambah(buatTugas('sinkronkan_data', { entitas: 'pengguna' }));
    const hasil = await pekerja.prosesSatu();

    pastikan(hasil, 'Pekerja harus memproses 1 tugas');
    pastikan(diproses, 'Handler tugas harus dieksekusi');
  });

  await ujiAsync('Percobaan ulang eksponensial (retry policy) dan batas maks gagal', async () => {
    const antrean = new AntreanTugasMemori();
    const kebijakan = new KebijakanPercobaanUlang({
      maksimalPercobaan: 2,
      jedaAwalMs: 10,
      pengali: 2,
    });
    const pekerja = new PekerjaLatarBelakang({
      antrean,
      kebijakanRetry: kebijakan,
    });

    let jumlahPanggilan = 0;
    pekerja.daftarkanHandler('tugas_gagal', async () => {
      jumlahPanggilan++;
      throw new Error('Koneksi timeout');
    });

    antrean.tambah(buatTugas('tugas_gagal', {}));

    // Eksekusi pertama -> gagal, dimasukkan ulang dengan jeda
    await pekerja.prosesSatu();
    samaDengan(jumlahPanggilan, 1, 'Panggilan pertama gagal');

    // Tunggu backoff sebentar
    await new Promise((r) => setTimeout(r, 30));

    // Eksekusi kedua -> gagal lagi, mencapai batas maksimalPercobaan (2)
    await pekerja.prosesSatu();
    samaDengan(jumlahPanggilan, 2, 'Panggilan kedua gagal');

    // Antrean sekarang harus kosong (tugas gagal permanen / dead-letter)
    samaDengan(antrean.panjang(), 0, 'Tugas harus keluar dari antrean aktif setelah batas retry');
  });

  // ---------------------------------------------------------------------------
  // 6. SCHEDULER (PenjadwalTugas)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Task Scheduler (PenjadwalTugas) ---');

  await ujiAsync('Penjadwalan tugas tertunda (delayed execution)', async () => {
    const antrean = new AntreanTugasMemori();
    const penjadwal = new PenjadwalTugas({ antrean });

    penjadwal.jadwalkanTugas(
      'tugas_tertunda',
      { data: 'nanti' },
      0.05 // 50ms
    );

    samaDengan(antrean.panjang(), 0, 'Belum masuk antrean sebelum waktunya');

    await new Promise((r) => setTimeout(r, 80));
    penjadwal.periksaJadwal();

    samaDengan(antrean.panjang(), 1, 'Harus sudah masuk antrean setelah jeda lewat');
    penjadwal.hentikan();
  });

  // ---------------------------------------------------------------------------
  // 7. CLI WORKER COMMAND INTEGRATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. CLI Worker Command Integration ---');

  await ujiAsync('CLI: nusantara worker status menampilkan statistik pekerja', async () => {
    const logBuffer: string[] = [];
    const asliLog = console.log;
    console.log = (...args: any[]) => logBuffer.push(args.join(' '));

    try {
      const cli = new NusantaraCLI();
      await cli.jalankan(['worker', 'status']);
      const output = logBuffer.join('\n');
      pastikan(
        output.includes('Status Pekerja & Antrean Tugas NUSANTARA'),
        'Harus menampilkan judul status worker'
      );
      pastikan(
        output.includes('Total Tugas Dalam Antrean'),
        'Harus menampilkan ringkasan antrean'
      );
    } finally {
      console.log = asliLog;
    }
  });

  // ---------------------------------------------------------------------------
  // 8. NUSANTARA LANGUAGE STDLIB INTEGRATION (.nusantara)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Nusantara Language Realtime Stdlib Execution ---');

  uji('Eksekusi skrip .nusantara dengan modul realtime', () => {
    const kodeNusantara = `program UjiRealtimeFase34
gunakan "realtime" sebagai rt

mulai
    tampilkan("--- UJI REALTIME NUSANTARA ---")

    bus : peta = rt.buatBusPeristiwa()
    idEvent : teks = bus.terbitkan("pesanan.dibuat", "PayloadData999")
    tampilkan("Event Terbit:", idEvent)

    antrean : peta = rt.buatAntrean("email_queue", 100)
    idTugas : teks = antrean.tambah("kirim_sambutan", "pengguna@nusantara.lang", 5)
    tampilkan("ID Tugas Antre:", idTugas)

    stats : peta = antrean.statistik()
    tampilkan("Total Antrean:", stats["total"])
selesai`;

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeNusantara);

    const out = penulis.ambilOutput();
    pastikan(out.includes('--- UJI REALTIME NUSANTARA ---'), 'Program Nusantara harus berjalan');
    pastikan(out.includes('Event Terbit:'), 'Event harus berhasil diterbitkan');
    pastikan(out.includes('ID Tugas Antre:'), 'Tugas harus berhasil ditambahkan ke antrean');
    pastikan(out.includes('Total Antrean: 1'), 'Statistik antrean harus menampilkan total 1');
  });

  // ---------------------------------------------------------------------------
  // RINGKASAN
  // ---------------------------------------------------------------------------
  console.log('\n=============================================================================');
  console.log(`HASIL AKHIR PENGUJIAN: Total: ${totalUji} | Lulus: ${totalLulus} | Gagal: ${totalGagal}`);
  console.log('=============================================================================');

  if (totalGagal > 0) {
    process.exit(1);
  }
}

jalankanSemuaPengujian();
