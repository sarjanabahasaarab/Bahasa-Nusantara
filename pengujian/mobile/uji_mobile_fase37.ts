/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 37 Test Suite
 * Pengujian Komprehensif Nusantara Mobile Application Framework (Android & iOS)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WebSocket } from 'ws';
import {
  AplikasiMobile,
  PengelolaLifecycleMobile,
  StatusLifecycleMobile,
  PengelolaKonfigurasiMobile,
  PengelolaStateMobile,
  KonteksAplikasiMobile,
  PengelolaIzinMobile,
  PenyimpananAmanMobile,
  TeksMobile,
  TombolMobile,
  InputTeksMobile,
  InputSandiMobile,
  SakelarMobile,
  KotakCentangMobile,
  TombolRadioMobile,
  DropdownMobile,
  GambarMobile,
  IkonMobile,
  IndikatorProgresMobile,
  IndikatorMemuatMobile,
  KartuMobile,
  PemisahMobile,
  DaftarMobile,
  GridMobile,
  DialogMobile,
  AlertMobile,
  SnackbarMobile,
  PengelolaResponsifMobile,
  AreaAmanMobile,
  TataLetakVertikalMobile,
  TataLetakHorizontalMobile,
  TataLetakTumpukMobile,
  TampilanGulirMobile,
  RuteMobile,
  NavigatorTumpukanMobile,
  NavigatorTabMobile,
  NavigasiBawahMobile,
  PengelolaDeepLinkMobile,
  InfoPerangkatMobile,
  StatusJaringanMobile,
  StatusBateraiMobile,
  GetaranMobile,
  PapanKlipMobile,
  LokasiPerangkatMobile,
  NotifikasiLokalMobile,
  BerbagiMobile,
  JembatanMobileNative,
  GeneratorJembatanMobileNative,
  PerenderMobile,
  HostPreviewMobile,
  DetektorToolchainMobile,
  PengelolaAsetMobile,
  AndroidDistributionManager,
  IOSDistributionManager,
  MobileCLI,
} from '../../src/mobile';
import { TemplateRegistry } from '../../src/generator/templateRegistry';
import { KATALOG_MODUL_STANDAR, normalisasiNamaModulStandar } from '../../src/stdlib';
import { Interpreter } from '../../src/interpreter/interpreter';
import { PenulisOutputBuffer } from '../../src/interpreter/outputWriter';
import { VERSI_NUSANTARA, FASE_TERAKHIR } from '../../src/konstanta/versi';

let lulusSemua = true;
let totalTes = 0;
let tesBerhasil = 0;

function uji(nama: string, fn: () => void | Promise<void>): Promise<void> {
  totalTes++;
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      tesBerhasil++;
      console.log(`  [✓ LULUS] ${nama}`);
    })
    .catch((err) => {
      lulusSemua = false;
      console.error(`  [✗ GAGAL] ${nama}`);
      console.error(`     Pesan Galat: ${err?.message || err}`);
      if (err?.stack) {
        console.error(`     Jejak Stack: ${err.stack.split('\n').slice(1, 4).join('\n')}`);
      }
    });
}

function pastikan(kondisi: boolean, pesan: string): void {
  if (!kondisi) {
    throw new Error(pesan);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log(`PENGUJIAN KOMPREHENSIF FASE 37: NUSANTARA MOBILE APPLICATION FRAMEWORK`);
  console.log(`Versi Bahasa Target: v${VERSI_NUSANTARA} (Fase ${FASE_TERAKHIR})`);
  console.log('='.repeat(70));

  // 1. Mobile Core
  console.log('\n[1] Mobile Core (Lifecycle, Konfigurasi, State, Konteks)');

  await uji('1.1 Pengelola Lifecycle Mobile & Transisi Status', () => {
    const lc = new PengelolaLifecycleMobile();
    pastikan(lc.dapatkanStatus() === StatusLifecycleMobile.DIBUAT, 'Status awal harus DIBUAT');

    const riwayat: StatusLifecycleMobile[] = [];
    lc.padaPerubahan((st) => {
      riwayat.push(st);
    });

    lc.transisiKe(StatusLifecycleMobile.MEMULAI);
    lc.transisiKe(StatusLifecycleMobile.AKTIF);
    lc.transisiKe(StatusLifecycleMobile.JEDA);
    lc.transisiKe(StatusLifecycleMobile.RESUME);
    lc.transisiKe(StatusLifecycleMobile.AKTIF);

    pastikan(lc.apakahAktif(), 'Status harus aktif setelah resume');
    pastikan(riwayat.includes(StatusLifecycleMobile.AKTIF), 'Riwayat harus merekam status AKTIF');
  });

  await uji('1.2 Pengelola Konfigurasi Mobile & Validasi Manifes', () => {
    const konfigValid = {
      nama: 'Aplikasi Keren',
      id: 'id.nusantara.aplikasikeren',
      versi: '1.2.0',
      nomorBuild: 2,
      platformTarget: { android: true, ios: true },
      versiMinPlatform: { androidMinSdk: 24, targetSdk: 34 },
    };

    const hasilValid = PengelolaKonfigurasiMobile.validasi(konfigValid);
    pastikan(hasilValid.valid, 'Konfigurasi harus valid');
    pastikan(hasilValid.galat.length === 0, 'Tidak boleh ada galat pada konfigurasi valid');

    const konfigRusak = {
      nama: '',
      id: 'ID SALAH!!',
      versi: 'bukan-semver',
      nomorBuild: -1,
      platformTarget: { android: false, ios: false },
    };

    const hasilRusak = PengelolaKonfigurasiMobile.validasi(konfigRusak);
    pastikan(!hasilRusak.valid, 'Konfigurasi rusak harus ditolak');
    pastikan(hasilRusak.galat.length >= 3, 'Harus mendeteksi banyak galat pada manifes tidak valid');
  });

  await uji('1.3 Pengelola State Reaktif Mobile', () => {
    const state = new PengelolaStateMobile({ skor: 100, masuk: false });
    pastikan(state.dapatkan('skor') === 100, 'State awal skor harus 100');

    let dipanggil = false;
    state.langgananKunci('skor', (baru, lama) => {
      dipanggil = true;
      pastikan(baru === 150 && lama === 100, 'Listener harus menerima nilai baru dan lama');
    });

    state.atur('skor', 150);
    pastikan(dipanggil, 'Listener kunci harus dipanggil');
    pastikan(state.dapatkan('skor') === 150, 'State skor harus diperbarui menjadi 150');
  });

  await uji('1.4 Konteks Aplikasi Mobile & Inisialisasi Singleton', () => {
    const konteks = KonteksAplikasiMobile.dapatkanKonteks();
    pastikan(konteks !== null, 'Konteks tidak boleh null');
    pastikan(konteks.pengelolaIzin !== undefined, 'Konteks harus memiliki PengelolaIzin');
    pastikan(konteks.state !== undefined, 'Konteks harus memiliki PengelolaState');
  });

  // 2. Keamanan & Perizinan
  console.log('\n[2] Keamanan & Manajemen Perizinan (Security & Permissions)');

  await uji('2.1 Pengelola Izin Dinamis (Runtime Permissions)', async () => {
    const pengelola = new PengelolaIzinMobile();
    pastikan(pengelola.dapatkanStatus('kamera') === 'belum_diminta', 'Izin kamera awal harus belum_diminta');
    pastikan(!pengelola.apakahDiizinkan('kamera'), 'Kamera belum diizinkan');

    const hasil = await pengelola.mintaIzin('kamera', 'Diperlukan untuk pindai QR');
    pastikan(hasil.diberikan, 'Izin kamera simulasi harus diberikan');
    pastikan(pengelola.apakahDiizinkan('kamera'), 'Status harus diizinkan');

    pengelola.cabutIzin('kamera');
    pastikan(!pengelola.apakahDiizinkan('kamera'), 'Izin kamera harus berhasil dicabut');
  });

  await uji('2.2 Penyimpanan Aman Terenkripsi AES-256 (Secure Storage)', () => {
    PenyimpananAmanMobile.simpan('token_otentikasi', 'jwt.secret.token.12345');
    pastikan(PenyimpananAmanMobile.memiliki('token_otentikasi'), 'Token harus ada di penyimpanan');

    const hasilAmbil = PenyimpananAmanMobile.ambil('token_otentikasi');
    pastikan(hasilAmbil === 'jwt.secret.token.12345', 'Token yang didekripsi harus persis sama dengan aslinya');

    PenyimpananAmanMobile.hapus('token_otentikasi');
    pastikan(!PenyimpananAmanMobile.memiliki('token_otentikasi'), 'Token harus sudah terhapus');
    pastikan(PenyimpananAmanMobile.ambil('token_otentikasi') === null, 'Token yang dihapus harus mengembalikan null');
  });

  // 3. UI Primitives & Overlays
  console.log('\n[3] Komponen Antarmuka & Hamparan Mobile (UI Primitives & Overlays)');

  await uji('3.1 Primitif Visual: Teks, Tombol, Media, dan Feedback', () => {
    const teks = new TeksMobile({ teks: 'Halo Mobile', gaya: { ukuranFont: 18 } });
    pastikan(teks.teks === 'Halo Mobile', 'Teks harus sesuai');
    teks.setTeks('Teks Diperbarui');
    pastikan(teks.teks === 'Teks Diperbarui', 'Teks harus terupdate');

    let tombolDiklik = false;
    const tombol = new TombolMobile({
      teks: 'Kirim',
      varian: 'primer',
      padaKlik: () => {
        tombolDiklik = true;
      },
    });
    tombol.picuKlik();
    pastikan(tombolDiklik, 'Tombol harus mengeksekusi aksi klik');

    const img = new GambarMobile({ sumber: 'aset/ikon.png' });
    pastikan(img.sumber === 'aset/ikon.png', 'Sumber gambar harus sesuai');

    const ikon = new IkonMobile({ nama: 'check', warna: '#00ff00' });
    pastikan(ikon.nama === 'check', 'Nama ikon harus sesuai');

    const progres = new IndikatorProgresMobile({ nilai: 45, nilaiMaksimum: 100 });
    pastikan(progres.dapatkanPersentase() === 45, 'Persentase progres harus 45%');

    const spinner = new IndikatorMemuatMobile({ sedangMemuat: true });
    pastikan(spinner.sedangMemuat, 'Spinner harus dalam keadaan memuat');
  });

  await uji('3.2 Primitif Formulir: Input, Sakelar, Checkbox, Radio, Dropdown', () => {
    const input = new InputTeksMobile({ placeholder: 'Nama', teks: 'Budi' });
    pastikan(input.teks === 'Budi', 'Input teks harus bernilai Budi');

    const sandi = new InputSandiMobile({ placeholder: 'Sandi' });
    pastikan(sandi.apakahSandi, 'Input sandi harus menandai apakahSandi = true');

    const sakelar = new SakelarMobile({ statusAktif: false });
    sakelar.setAktifkan(true);
    pastikan(sakelar.statusAktif, 'Sakelar harus aktif');

    const centang = new KotakCentangMobile({ label: 'Setuju', dicentang: false });
    centang.setDicentang(true);
    pastikan(centang.dicentang, 'Kotak centang harus dicentang');

    const radio = new TombolRadioMobile({ label: 'Pria', nilai: 'L', terpilih: true });
    pastikan(radio.terpilih && radio.nilai === 'L', 'Radio button harus terpilih');

    const dropdown = new DropdownMobile({
      daftarOpsi: [
        { label: 'Jakarta', nilai: 'JKT' },
        { label: 'Bandung', nilai: 'BDG' },
      ],
      nilaiTerpilih: 'JKT',
    });
    pastikan(dropdown.nilaiTerpilih === 'JKT', 'Dropdown harus memilih Jakarta');
  });

  await uji('3.3 Primitif Daftar, Grid, dan Kartu', () => {
    const kartu = new KartuMobile();
    kartu.tambahAnak(new TeksMobile({ teks: 'Dalam Kartu' }));
    pastikan(kartu.anak.length === 1, 'Kartu harus memiliki 1 anak');

    const daftar = new DaftarMobile({
      data: ['Item 1', 'Item 2', 'Item 3'],
      pembuatItem: (item) => new TeksMobile({ teks: String(item) }),
    });
    pastikan(daftar.anak.length === 3, 'Daftar harus membangun 3 anak');

    const grid = new GridMobile({
      jumlahKolom: 3,
      data: [1, 2, 3, 4, 5, 6],
      pembuatItem: (item) => new TeksMobile({ teks: `Grid ${item}` }),
    });
    pastikan(grid.jumlahKolom === 3, 'Jumlah kolom grid harus 3');
    pastikan(grid.anak.length === 6, 'Grid harus membangun 6 elemen anak');
  });

  await uji('3.4 Komponen Hamparan: Dialog, Alert, dan Snackbar', () => {
    const dialog = new DialogMobile({ judul: 'Konfirmasi', konten: 'Lanjutkan proses?' });
    dialog.buka();
    pastikan(dialog.terbuka, 'Dialog harus terbuka');
    dialog.tutup();
    pastikan(!dialog.terbuka, 'Dialog harus tertutup');

    const alert = new AlertMobile({ judul: 'Peringatan', pesan: 'Terjadi kesalahan jaringan' });
    alert.buka();
    pastikan(alert.terbuka && alert.pesanTeks === 'Terjadi kesalahan jaringan', 'Alert harus terbuka dengan pesan');

    const snackbar = new SnackbarMobile({ pesan: 'Data tersimpan', durasiMs: 500, tipe: 'sukses' });
    snackbar.tampilkan();
    pastikan(snackbar.terbuka && snackbar.tipe === 'sukses', 'Snackbar harus tampil');
    snackbar.sembunyikan();
    pastikan(!snackbar.terbuka, 'Snackbar harus tersembunyi');
  });

  // 4. Sistem Tata Letak & Responsif
  console.log('\n[4] Sistem Tata Letak & Responsivitas (Layout Engine & Responsive Breakpoints)');

  await uji('4.1 Pengelola Responsif & Deteksi Breakpoint', () => {
    const resp = new PengelolaResponsifMobile(390, 844, 3);
    pastikan(resp.dapatkanOrientasi() === 'potret', 'Orientasi harus potret');
    pastikan(resp.dapatkanBreakpoint() === 'ponsel_standar', 'Breakpoint 390px harus ponsel_standar');

    resp.perbaruiDimensi(1024, 768);
    pastikan(resp.dapatkanOrientasi() === 'lanskap', 'Orientasi 1024x768 harus lanskap');
    pastikan(resp.dapatkanBreakpoint() === 'ponsel_besar', 'Lebar efektif 768px harus ponsel_besar');

    resp.perbaruiDimensi(1200, 900);
    pastikan(resp.dapatkanBreakpoint() === 'tablet', 'Dimensi 1200x900 harus tablet');
  });

  await uji('4.2 Wadah Area Aman (Safe Area Container)', () => {
    const areaAman = new AreaAmanMobile({
      inset: { atas: 47, bawah: 34, kiri: 0, kanan: 0 },
    });
    const padding = areaAman.dapatkanPaddingEfektif();
    pastikan(padding[0] === 47, 'Padding atas harus 47px');
    pastikan(padding[2] === 34, 'Padding bawah harus 34px');
  });

  await uji('4.3 Tata Letak Fleksibel, Bertumpuk, dan Tampilan Gulir', () => {
    const vertikal = new TataLetakVertikalMobile({ jarakAntarItem: 10 });
    vertikal.tambahAnak(new TeksMobile({ teks: 'A' }));
    vertikal.tambahAnak(new TeksMobile({ teks: 'B' }));
    pastikan(vertikal.anak.length === 2, 'Tata letak vertikal harus memuat 2 anak');
    pastikan(vertikal.arah === 'vertikal', 'Arah harus vertikal');

    const horizontal = new TataLetakHorizontalMobile({ jarakAntarItem: 8 });
    pastikan(horizontal.arah === 'horizontal', 'Arah harus horizontal');

    const tumpuk = new TataLetakTumpukMobile();
    tumpuk.tambahAnakBerposisi(new TeksMobile({ teks: 'Mengambang' }), { atas: 20, kanan: 20, zIndex: 10 });
    pastikan(tumpuk.dapatkanPosisi(tumpuk.anak[0].id)?.zIndex === 10, 'Z-index harus 10');

    const gulir = new TampilanGulirMobile({ arah: 'vertikal' });
    gulir.gulirKe(0, 150);
    pastikan(gulir.posisiY === 150, 'Posisi gulir Y harus 150');
  });

  // 5. Sistem Navigasi & Tautan Dalam
  console.log('\n[5] Sistem Navigasi & Deep Linking (Navigation)');

  await uji('5.1 Navigator Tumpukan (Stack Navigator)', () => {
    const nav = new NavigatorTumpukanMobile();
    nav.daftarkanRute(new RuteMobile({ nama: 'beranda', pembuatHalaman: () => new TeksMobile({ teks: 'Halaman Beranda' }) }));
    nav.daftarkanRute(new RuteMobile({ nama: 'detail', pembuatHalaman: (p) => new TeksMobile({ teks: `Detail ID ${p['id']}` }) }));

    nav.dorong('beranda');
    pastikan(nav.dapatkanKedalaman() === 1, 'Kedalaman tumpukan harus 1');
    pastikan(!nav.bisaKembali(), 'Tidak boleh bisa kembali di halaman awal');

    nav.dorong('detail', { id: 42 });
    pastikan(nav.dapatkanKedalaman() === 2, 'Kedalaman tumpukan harus 2');
    pastikan(nav.bisaKembali(), 'Harus bisa kembali setelah dorong');
    pastikan(nav.dapatkanRuteAktif()?.namaRute === 'detail', 'Rute aktif harus detail');

    const suksesKembali = nav.kembali();
    pastikan(suksesKembali, 'Panggilan kembali harus berhasil');
    pastikan(nav.dapatkanRuteAktif()?.namaRute === 'beranda', 'Kembali ke rute beranda');
    pastikan(nav.dapatkanKedalaman() === 1, 'Kedalaman tumpukan kembali menjadi 1');
  });

  await uji('5.2 Navigator Tab & Bilah Navigasi Bawah', () => {
    const tabNav = new NavigatorTabMobile({
      daftarTab: [
        { kunci: 'beranda', label: 'Beranda', pembuatKonten: () => new TeksMobile({ teks: 'Konten Beranda' }) },
        { kunci: 'profil', label: 'Profil', pembuatKonten: () => new TeksMobile({ teks: 'Konten Profil' }) },
      ],
    });
    pastikan(tabNav.tabAktif === 'beranda', 'Tab aktif awal harus beranda');

    tabNav.pilihTab('profil');
    pastikan(tabNav.tabAktif === 'profil', 'Tab aktif harus beralih ke profil');

    const bottomNav = new NavigasiBawahMobile({
      items: [
        { kunci: 'home', label: 'Home', ikon: 'home' },
        { kunci: 'settings', label: 'Settings', ikon: 'settings' },
      ],
    });
    bottomNav.pilih('settings');
    pastikan(bottomNav.kunciAktif === 'settings', 'Navigasi bawah harus memilih settings');
  });

  await uji('5.3 Pengelola Tautan Dalam (Deep Linking)', () => {
    const deepLink = new PengelolaDeepLinkMobile(['tokoku']);
    const parsed = deepLink.uraikanUrl('tokoku://produk/sepatu-nusantara?ukuran=42&warna=merah');

    pastikan(parsed !== null, 'URL deep link harus berhasil diurai');
    pastikan(parsed!.skema === 'tokoku', 'Skema harus tokoku');
    pastikan(parsed!.jalur === '/sepatu-nusantara', 'Jalur harus /sepatu-nusantara');
    pastikan(parsed!.parameter['ukuran'] === '42', 'Parameter ukuran harus 42');
    pastikan(parsed!.parameter['warna'] === 'merah', 'Parameter warna harus merah');

    let ruteDitangani = false;
    deepLink.daftarkanPenangan('/sepatu-nusantara', (hasil) => {
      ruteDitangani = true;
      pastikan(hasil.parameter['ukuran'] === '42', 'Penangan harus menerima parameter');
    });

    deepLink.tanganiUrl('tokoku://produk/sepatu-nusantara?ukuran=42&warna=merah');
    pastikan(ruteDitangani, 'Penangan deep link harus terpanggil');
  });

  // 6. API Perangkat Mobile
  console.log('\n[6] API Perangkat Mobile (Device APIs)');

  await uji('6.1 Info Perangkat, Jaringan, dan Baterai', () => {
    const dev = InfoPerangkatMobile.dapatkanInfo();
    pastikan(dev.lebarLayar === 390 && dev.tinggiLayar === 844, 'Resolusi layar standar harus 390x844');
    pastikan(InfoPerangkatMobile.apakahSimulator(), 'Perangkat simulasi harus terdeteksi');

    const net = StatusJaringanMobile.dapatkanStatus();
    pastikan(net.terhubung, 'Status jaringan harus terhubung');

    const bat = StatusBateraiMobile.dapatkanStatus();
    pastikan(bat.level >= 0 && bat.level <= 1.0, 'Level baterai harus valid');
    pastikan(StatusBateraiMobile.dapatkanPersentase() > 0, 'Persentase baterai harus > 0');
  });

  await uji('6.2 Umpan Balik Haptik, Papan Klip, Notifikasi, dan Berbagi', async () => {
    GetaranMobile.bersihkanRiwayat();
    GetaranMobile.haptik('sukses');
    pastikan(GetaranMobile.dapatkanRiwayat().length === 1, 'Riwayat getaran harus merekam 1 peristiwa');

    await PapanKlipMobile.salin('Teks Salinan Mobile');
    pastikan(PapanKlipMobile.memilikiTeks(), 'Papan klip harus memiliki teks');
    const isiTempel = await PapanKlipMobile.tempel();
    pastikan(isiTempel === 'Teks Salinan Mobile', 'Teks tempel harus sesuai');

    const suksesNotif = await NotifikasiLokalMobile.jadwalkan({
      id: 'uji_1',
      judul: 'Uji Notif',
      pesan: 'Pesan pengujian',
      tundaDetik: 0,
    });
    pastikan(suksesNotif, 'Penjadwalan notifikasi harus berhasil');

    BerbagiMobile.bersihkanRiwayat();
    await BerbagiMobile.bagikan({ judul: 'Bagikan', teks: 'Mari gunakan Nusantara' });
    pastikan(BerbagiMobile.dapatkanRiwayat().length === 1, 'Riwayat berbagi harus merekam 1 aksi');
  });

  // 7. Jembatan Native & Pengelola Aset
  console.log('\n[7] Jembatan Native & Pengelola Aset (Native Bridge & Asset Manager)');

  await uji('7.1 Jembatan Komunikasi Native (Native Message Protocol)', async () => {
    const bridge = JembatanMobileNative.dapatkanInstance();
    bridge.bersihkanRiwayat();

    bridge.daftarkanMetode('kamera', 'ambilFoto', (arg) => {
      return { status: 'sukses', resolusi: arg.resolusi || '1080p' };
    });

    const hasil = await bridge.panggilNative('kamera', 'ambilFoto', { resolusi: '4k' });
    pastikan(hasil.status === 'sukses' && hasil.resolusi === '4k', 'Respon native harus sesuai');
    pastikan(bridge.dapatkanRiwayatPesan().length === 2, 'Riwayat harus mencatat 1 permintaan & 1 respon');
  });

  await uji('7.2 Pengelola Aset & Pertahanan Path Traversal', () => {
    const am = new PengelolaAsetMobile('aset');
    pastikan(!am.periksaJalurAman('../rahasia.txt'), 'Path traversal harus ditolak');
    pastikan(!am.periksaJalurAman('/etc/passwd'), 'Path root absolut harus ditolak');
    pastikan(!am.periksaJalurAman('skrip.exe'), 'Ekstensi biner tidak dikenal harus ditolak');

    pastikan(am.periksaJalurAman('gambar/logo.png'), 'Aset PNG harus diizinkan');
    const info = am.daftarkanAset('gambar/logo.png', 10240);
    pastikan(info.tipeKonten === 'image/png', 'Tipe konten harus image/png');
    pastikan(am.memilikiAset('gambar/logo.png'), 'Aset harus terdaftar dalam cache');
  });

  // 8. Sistem Build Android & iOS
  console.log('\n[8] Fondasi Sistem Build Android & iOS (Build Foundations)');

  await uji('8.1 Pemeriksaan Lingkungan & Generator Manifes Android', () => {
    const env = AndroidDistributionManager.periksaLingkungan();
    pastikan(env !== null, 'Hasil periksa Android tidak boleh null');
    pastikan(Array.isArray(env.catatan), 'Catatan lingkungan harus array');

    const konfig = {
      nama: 'Toko Nusantara',
      id: 'id.nusantara.toko',
      versi: '1.0.0',
      nomorBuild: 1,
      platformTarget: { android: true, ios: true },
      daftarIzin: ['kamera', 'lokasi', 'notifikasi'] as any,
    };

    const manifestXml = MobileCLI.buatAndroidManifest(konfig);
    pastikan(manifestXml.includes('package="id.nusantara.toko"'), 'Manifest harus memuat package name');
    pastikan(manifestXml.includes('android.permission.CAMERA'), 'Manifest harus memuat izin kamera');
    pastikan(manifestXml.includes('android.permission.ACCESS_FINE_LOCATION'), 'Manifest harus memuat izin lokasi');

    const gradle = MobileCLI.buatBuildGradleApp(konfig);
    pastikan(gradle.includes('applicationId "id.nusantara.toko"'), 'build.gradle harus memuat applicationId');
    pastikan(gradle.includes('compileSdk 34'), 'build.gradle harus menargetkan compileSdk 34');
  });

  await uji('8.2 Pemeriksaan Lingkungan & Generator Manifes iOS', () => {
    const envIOS = IOSDistributionManager.periksaLingkungan();
    pastikan(envIOS !== null, 'Hasil periksa iOS tidak boleh null');

    const konfig = {
      nama: 'Toko Nusantara',
      id: 'id.nusantara.toko',
      versi: '1.0.0',
      nomorBuild: 1,
      platformTarget: { android: true, ios: true },
      daftarIzin: ['kamera', 'lokasi'] as any,
    };

    const plistXml = MobileCLI.buatInfoPlist(konfig);
    pastikan(plistXml.includes('CFBundleIdentifier'), 'Info.plist harus memuat CFBundleIdentifier');
    pastikan(plistXml.includes('id.nusantara.toko'), 'Info.plist harus memuat bundle ID');
    pastikan(plistXml.includes('NSCameraUsageDescription'), 'Info.plist harus menyertakan izin kamera');

    const podfile = MobileCLI.buatPodfileTemplate(konfig);
    pastikan(podfile.includes("platform :ios, '15.0'"), 'Podfile harus menargetkan iOS 15.0');
  });

  // 9. CLI & Template Registry
  console.log('\n[9] Mobile CLI & Template Registry Integration');

  await uji('9.1 Eksekusi Perintah Mobile CLI', () => {
    const kodeInfo = MobileCLI.jalankan(['info']);
    pastikan(kodeInfo === 0, 'nusantara mobile info harus menghasilkan status 0');

    const kodeCek = MobileCLI.jalankan(['periksa']);
    pastikan(kodeCek === 0, 'nusantara mobile periksa harus menghasilkan status 0');

    const kodePlatform = MobileCLI.jalankan(['platform', 'daftar']);
    pastikan(kodePlatform === 0, 'nusantara mobile platform daftar harus sukses');

    const kodeBuild = MobileCLI.jalankan(['build', 'android']);
    pastikan(kodeBuild === 0, 'nusantara mobile build android harus sukses');

    const kodeRun = MobileCLI.jalankan(['jalankan', 'desktop']);
    pastikan(kodeRun === 0, 'nusantara mobile jalankan desktop harus sukses');
  });

  await uji('9.2 Template Proyek Mobile pada TemplateRegistry', () => {
    const registry = new TemplateRegistry();
    pastikan(registry.apakahAda('mobile'), 'Template mobile harus terdaftar');

    const tmpl = registry.dapatkan('mobile');
    pastikan(tmpl !== undefined, 'Template mobile harus dapat diambil');
    pastikan(tmpl!.kategori === 'aplikasi', 'Kategori template harus aplikasi');
    pastikan(tmpl!.versiMinimumNusantara === '0.37.0', 'Versi minimum harus 0.37.0');
    pastikan(tmpl!.berkas.some((b) => b.jalur === 'src/utama.nusantara'), 'Harus menyertakan src/utama.nusantara');
  });

  // 10. Modul Standard Library std:mobile & Eksekusi Program Nyata
  console.log('\n[10] Modul Standard Library std:mobile & Eksekusi Contoh Nyata');

  await uji('10.1 Registrasi Standard Library std:mobile dan Alias-aliasnya', () => {
    pastikan(KATALOG_MODUL_STANDAR['mobile'] !== undefined, 'Modul mobile harus ada di KATALOG_MODUL_STANDAR');
    pastikan(KATALOG_MODUL_STANDAR['seluler'] !== undefined, 'Modul seluler harus ada di KATALOG_MODUL_STANDAR');
    pastikan(KATALOG_MODUL_STANDAR['android'] !== undefined, 'Modul android harus ada di KATALOG_MODUL_STANDAR');
    pastikan(KATALOG_MODUL_STANDAR['ios'] !== undefined, 'Modul ios harus ada di KATALOG_MODUL_STANDAR');

    pastikan(normalisasiNamaModulStandar('std:mobile') === 'mobile', 'Normalisasi std:mobile');
    pastikan(normalisasiNamaModulStandar('seluler') === 'seluler', 'Normalisasi seluler');
    pastikan(normalisasiNamaModulStandar('android') === 'android', 'Normalisasi android');
    pastikan(normalisasiNamaModulStandar('ios') === 'ios', 'Normalisasi ios');
  });

  await uji('10.2 Eksekusi Skrip contoh/mobile/hello_mobile.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/mobile/hello_mobile.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Aplikasi Halo Mobile berhasil diinisialisasi dan dijalankan.'), 'Program hello_mobile harus dieksekusi dengan sukses');
  });

  await uji('10.3 Eksekusi Skrip contoh/mobile/counter_mobile.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/mobile/counter_mobile.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Aplikasi Penghitung Mobile berhasil berjalan.'), 'Program counter_mobile harus dieksekusi dengan sukses');
  });

  await uji('10.4 Eksekusi Skrip contoh/mobile/profile_mobile.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/mobile/profile_mobile.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Aplikasi Profil Pengguna siap beroperasi.'), 'Program profile_mobile harus dieksekusi dengan sukses');
  });

  await uji('10.5 Eksekusi Skrip contoh/mobile/demo_mobile.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/mobile/demo_mobile.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Demo Lengkap Nusantara Mobile sukses dijalankan.'), 'Program demo_mobile harus dieksekusi dengan sukses');
  });

  // 11. Native Bridge Codegen (Kotlin Android & Swift iOS) & Transport
  console.log('\n[11] Jembatan Native Kotlin & Swift + Pluggable Transport');

  await uji('11.1 Generator Kotlin & Swift Native Bridge + TransportJembatanNative kustom', async () => {
    const bridge = JembatanMobileNative.dapatkanInstance();
    const konfig = {
      nama: 'NusantaraPay',
      id: 'id.nusantara.pay',
      versi: '1.0.0',
      nomorBuild: 1,
      platformTarget: { android: true, ios: true },
      daftarIzin: ['internet', 'kamera'] as any,
    };

    const bundel = bridge.hasilkanBindingNative(konfig);
    const ktBridge = bundel.android.find((b) => b.jalur.endsWith('NusantaraNativeBridge.kt'));
    const ktMain = bundel.android.find((b) => b.jalur.endsWith('MainActivity.kt'));
    const swiftBridge = bundel.ios.find((b) => b.jalur.endsWith('NusantaraNativeBridge.swift'));
    const swiftVC = bundel.ios.find((b) => b.jalur.endsWith('NusantaraViewController.swift'));

    pastikan(Boolean(ktBridge && ktBridge.isi.includes('@JavascriptInterface')), 'Android Kotlin Bridge harus memiliki @JavascriptInterface');
    pastikan(Boolean(ktMain && ktMain.isi.includes('addJavascriptInterface')), 'MainActivity Kotlin harus memasang NusantaraAndroidBridge');
    pastikan(Boolean(swiftBridge && swiftBridge.isi.includes('WKScriptMessageHandler')), 'iOS Swift Bridge harus mengimplementasikan WKScriptMessageHandler');
    pastikan(Boolean(swiftVC && swiftVC.isi.includes('WKWebView')), 'iOS ViewController Swift harus memuat WKWebView');

    // Uji transport eksternal pluggable
    let dikirimKeTransport = false;
    bridge.pasangTransport({
      namaTransport: 'test-jni-pipe',
      async kirimKeNative(req) {
        dikirimKeTransport = true;
        return {
          id: req.id,
          sukses: true,
          data: `echo:${req.modul}.${req.metode}`,
          stempelWaktu: Date.now(),
        };
      },
    });
    try {
      pastikan(bridge.dapatkanNamaTransport() === 'test-jni-pipe', 'Nama transport aktif harus test-jni-pipe');
      const res = await bridge.panggilNative('perangkat', 'ping');
      pastikan(dikirimKeTransport && res === 'echo:perangkat.ping', 'Panggilan bridge harus dirutekan melalui transport eksternal');
    } finally {
      bridge.pasangTransport(null);
    }
  });

  await uji('11.2 AplikasiMobile memancarkan peristiwa lifecycle nyata melalui JembatanMobileNative', async () => {
    const bridge = JembatanMobileNative.dapatkanInstance();
    const terekam: string[] = [];
    const lepas = bridge.langgananPeristiwa('lifecycle', (ev) => {
      terekam.push(String(ev.data?.status));
    });
    const app = new AplikasiMobile({ nama: 'UjiLifecycle', id: 'id.nusantara.lc', versi: '1.0.0', nomorBuild: 1 });
    try {
      await app.jalankan();
      await app.jeda();
      await app.lanjutkan();
      await app.hentikan();
      pastikan(
        terekam.includes(StatusLifecycleMobile.AKTIF) &&
          terekam.includes(StatusLifecycleMobile.JEDA) &&
          terekam.includes(StatusLifecycleMobile.BERHENTI),
        'JembatanMobileNative harus menerima peristiwa lifecycle AKTIF, JEDA, dan BERHENTI'
      );
    } finally {
      lepas();
      await app.hancurkan();
    }
  });

  // 12. Mobile UI Viewport Renderer (HTML5 + SVG + Native JSON Tree)
  console.log('\n[12] Perender Antarmuka Mobile (HTML5, SVG & Pohon UI Native)');

  await uji('12.1 PerenderMobile merender UI mobile, Navigator & SafeArea menjadi HTML, SVG & UI Tree', async () => {
    const app = new AplikasiMobile({ nama: 'WarungDigital', id: 'id.nusantara.warung', versi: '1.2.0', nomorBuild: 3 });
    const safe = new AreaAmanMobile();
    safe.tambahAnak(new TeksMobile({ teks: 'Selamat Datang', gaya: { beratFont: 'tebal' } }));
    safe.tambahAnak(new TombolMobile({ teks: 'Bayar Sekarang' }));
    app.tambahKomponenAkar(safe);

    const perender = new PerenderMobile();
    const html = perender.renderKeHTML(app, 'ws://127.0.0.1:9000/ipc');
    const svg = perender.renderKeSVG(app);
    const tree = perender.bangunPohonUINative(app);

    pastikan(html.includes('NusantaraAndroidBridge') && html.includes('Bayar Sekarang'), 'HTML viewport harus memuat bridge Android/iOS & tombol');
    pastikan(svg.includes('<svg') && svg.includes('Selamat Datang'), 'SVG preview harus valid dan memuat konten teks');
    pastikan(tree.aplikasi === 'WarungDigital' && Array.isArray(tree.komponenAkar), 'Pohon UI Native harus valid');
    await app.hancurkan();
  });

  // 13. Loopback HTTP + WebSocket Mobile Preview Host Runtime
  console.log('\n[13] Loopback HTTP + WebSocket Mobile Preview Host Runtime');

  await uji('13.1 HostPreviewMobile melayani HTTP HTML/JSON state & memproses peristiwa + bridge IPC via WebSocket', async () => {
    const app = new AplikasiMobile({ nama: 'LiveMobileApp', id: 'id.nusantara.live', versi: '1.0.0', nomorBuild: 1 });
    let diklik = false;
    const btn = new TombolMobile('Proses', () => { diklik = true; });
    const inp = new InputTeksMobile('Catatan', '');
    const sw = new SakelarMobile(false, 'Notifikasi');
    const kol = new TataLetakVertikalMobile({ jarakAntarItem: 8 });
    kol.tambahAnak(btn).tambahAnak(inp).tambahAnak(sw);
    app.tambahKomponenAkar(kol);
    await app.jalankan();

    const host = new HostPreviewMobile(app, 0);
    try {
      const url = await host.mulai();
      const resHtml = await fetch(url);
      const html = await resHtml.text();
      pastikan(resHtml.status === 200 && html.includes('Proses'), 'GET / harus menyajikan HTML preview aplikasi mobile');

      const resState = await fetch(`${url}/api/state`);
      const stateJson = (await resState.json()) as any;
      pastikan(stateJson.aplikasi === 'LiveMobileApp', 'GET /api/state harus mengembalikan metadata aplikasi mobile');

      const wsUrl = url.replace('http://', 'ws://') + '/ipc';
      let bridgePong = false;
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        ws.on('open', () => {
          ws.send(JSON.stringify({ tipe: 'bridge_call', id: 'b1', modul: 'perangkat', metode: 'ping' }));
          ws.send(JSON.stringify({ tipe: 'peristiwa', jenis: 'teks_berubah', idKomponen: inp.id, nilaiTeks: 'Halo Socket' }));
          ws.send(JSON.stringify({ tipe: 'peristiwa', jenis: 'nilai_berubah', idKomponen: sw.id, nilaiLogika: true }));
          ws.send(JSON.stringify({ tipe: 'peristiwa', jenis: 'klik', idKomponen: btn.id }));
        });
        ws.on('message', (raw) => {
          const msg = JSON.parse(String(raw));
          if (msg.tipe === 'bridge_respon' && msg.data === 'pong') bridgePong = true;
          if (msg.tipe === 'sinkronisasi' && diklik && inp.nilai === 'Halo Socket' && sw.aktifStatus && bridgePong) {
            ws.close();
            resolve();
          }
        });
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout menunggu sinkronisasi HostPreviewMobile WebSocket')), 3000);
      });

      pastikan(diklik && bridgePong && inp.nilai === 'Halo Socket' && sw.aktifStatus, 'Semua aksi WebSocket harus memperbarui state & komponen nyata');
    } finally {
      await host.hentikan();
      await app.hancurkan();
    }
  });

  // 14. Detektor Toolchain Mobile & Artefak Proyek CLI Nyata
  console.log('\n[14] Detektor Toolchain Mobile & Artefak Build Kotlin/Swift CLI');

  await uji('14.1 DetektorToolchainMobile & MobileCLI baru/build menghasilkan sumber Kotlin/Swift & SHA256SUMS', () => {
    const tc = DetektorToolchainMobile.deteksi();
    pastikan(tc.nodeRuntime && typeof tc.android.siapKompilasiNative === 'boolean', 'Detektor harus memeriksa kapabilitas Android & iOS secara faktual');

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nusantara-mobile-f37-'));
    try {
      const outAndroid = path.join(tmpRoot, 'out-android');
      pastikan(MobileCLI.jalankan(['build', 'android', `--out=${outAndroid}`]) === 0, 'mobile build android --out harus exit 0');
      pastikan(fs.existsSync(path.join(outAndroid, 'SHA256SUMS')), 'Keluaran build Android harus memuat SHA256SUMS');
      pastikan(
        fs.existsSync(path.join(outAndroid, 'android/app/src/main/java/id/nusantara/app/NusantaraNativeBridge.kt')),
        'Keluaran build Android harus memuat NusantaraNativeBridge.kt'
      );

      const outIOS = path.join(tmpRoot, 'out-ios');
      pastikan(MobileCLI.jalankan(['build', 'ios', `--out=${outIOS}`]) === 0, 'mobile build ios --out harus exit 0');
      pastikan(
        fs.existsSync(path.join(outIOS, 'ios/Sources/NusantaraNativeBridge.swift')),
        'Keluaran build iOS harus memuat NusantaraNativeBridge.swift'
      );
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  console.log('='.repeat(70));
  console.log(`HASIL PENGUJIAN FASE 37: ${tesBerhasil}/${totalTes} LULUS`);
  if (!lulusSemua) {
    console.error('Pengujian Fase 37 GAGAL!');
    process.exit(1);
  } else {
    console.log('Semua pengujian Fase 37 BERHASIL 100%!');
  }
}

main().catch((err) => {
  console.error('Galat fatal dalam pengujian Fase 37:', err);
  process.exit(1);
});
