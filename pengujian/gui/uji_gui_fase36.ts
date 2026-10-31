/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NUSANTARA Programming Language - Phase 36 Test Suite
 * Pengujian Komprehensif GUI Framework & Desktop Application Development
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AplikasiGUI,
  JendelaGUI,
  StatusAplikasi,
  EventLoopGUI,
  PengelolaLifecycle,
  LabelWidget,
  TombolWidget,
  InputTeksWidget,
  AreaTeksWidget,
  KotakCentangWidget,
  TombolRadioWidget,
  GrupRadio,
  PilihanDropdownWidget,
  DaftarWidget,
  TabelWidget,
  GambarWidget,
  IndikatorProgresWidget,
  SliderWidget,
  TabWidget,
  BarisLayout,
  KolomLayout,
  GridLayout,
  StackLayout,
  WadahGulirWidget,
  BilahMenu,
  Menu,
  ItemMenu,
  BilahAlat,
  PengelolaDialogGUI,
  PengelolaTema,
  pengelolaTemaGlobal,
  PengelolaFormGUI,
  AdaptorHeadlessGUI,
  JembatanDesktopWebview,
  sesuaikanShortcutOS,
  buatAtributAria,
  temukanWidgetDapatDifokuskan,
} from '../../src/gui';
import { TemplateRegistry } from '../../src/generator/templateRegistry';
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
  console.log('PENGUJIAN SISTEM GUI FRAMEWORK & DESKTOP APPLICATION (PHASE 36)');
  console.log('Target Versi: v0.36.0');
  console.log('='.repeat(70));

  // --- 1. CORE & LIFECYCLE ---
  await uji('1.1 Manajemen Lifecycle & Transisi Status Aplikasi', async () => {
    const lc = new PengelolaLifecycle();
    pastikan(lc.getStatus() === StatusAplikasi.DIBUAT, 'Status awal harus DIBUAT');

    let inisialisasiDipanggil = false;
    let mulaiDipanggil = false;
    let berhentiDipanggil = false;

    lc.onInisialisasi(() => { inisialisasiDipanggil = true; });
    lc.onMulai(() => { mulaiDipanggil = true; });
    lc.onBerhenti(() => { berhentiDipanggil = true; });

    await lc.transisiKe(StatusAplikasi.MEMULAI);
    pastikan(inisialisasiDipanggil, 'Hook inisialisasi harus dipanggil');

    await lc.transisiKe(StatusAplikasi.BERJALAN);
    pastikan(mulaiDipanggil, 'Hook mulai harus dipanggil');

    await lc.transisiKe(StatusAplikasi.BERHENTI);
    pastikan(berhentiDipanggil, 'Hook berhenti harus dipanggil');
  });

  await uji('1.2 EventLoopGUI Antrean Tugas & Tick Processing', async () => {
    const loop = new EventLoopGUI();
    let tugas1Selesai = false;
    let tugas2Selesai = false;

    loop.kirimTugas(() => { tugas1Selesai = true; });
    loop.kirimTugas(async () => { tugas2Selesai = true; });

    const jml = await loop.prosesSatuTick();
    pastikan(jml === 2, 'Harus memproses 2 tugas');
    pastikan(tugas1Selesai && tugas2Selesai, 'Kedua tugas dalam antrean harus dieksekusi');
    loop.hentikan();
  });

  // --- 2. WINDOW MANAGEMENT ---
  await uji('2.1 Pembuatan dan Konfigurasi JendelaGUI', async () => {
    const jendela = new JendelaGUI({
      judul: 'Jendela Uji',
      lebar: 800,
      tinggi: 600,
      lebarMin: 400,
      tinggiMin: 300,
      lebarMaks: 1200,
      tinggiMaks: 900,
      dapatDiubahUkuran: true,
    });

    pastikan(jendela.judul === 'Jendela Uji', 'Judul jendela harus sesuai');
    pastikan(jendela.lebar === 800 && jendela.tinggi === 600, 'Ukuran awal harus 800x600');

    // Ubah ukuran dalam batas
    jendela.ubahUkuran(1000, 700);
    pastikan(jendela.lebar === 1000 && jendela.tinggi === 700, 'Ukuran baru harus 1000x700');

    // Uji clamping batas minimum
    jendela.ubahUkuran(200, 100);
    pastikan(jendela.lebar === 400 && jendela.tinggi === 300, 'Ukuran harus dijepit pada batas minimum');

    // Uji clamping batas maksimum
    jendela.ubahUkuran(2000, 1500);
    pastikan(jendela.lebar === 1200 && jendela.tinggi === 900, 'Ukuran harus dijepit pada batas maksimum');

    // Manipulasi status
    jendela.maksimalkan();
    pastikan(jendela.status === 'dimaksimalkan', 'Status harus dimaksimalkan');
    jendela.minimalkan();
    pastikan(jendela.status === 'diminimalkan', 'Status harus diminimalkan');
    jendela.pulihkan();
    pastikan(jendela.status === 'normal', 'Status harus normal');

    let jendelaDitutup = false;
    jendela.pasang('jendela_ditutup', () => {
      jendelaDitutup = true;
    });
    await jendela.tutup();
    pastikan(jendelaDitutup, 'Event jendela_ditutup harus terpanggil');
  });

  // --- 3. WIDGET SYSTEM ---
  await uji('3.1 LabelWidget, TombolWidget, InputTeksWidget, AreaTeksWidget', async () => {
    const label = new LabelWidget('Teks Awal');
    label.setTeks('Teks Diperbarui');
    pastikan(label.getTeks() === 'Teks Diperbarui', 'Teks label harus diperbarui');

    let tombolDiklik = false;
    const tombol = new TombolWidget('Simpan');
    tombol.pasang('klik', () => { tombolDiklik = true; });
    await tombol.picu('klik');
    pastikan(tombolDiklik, 'Tombol harus menerima event klik');

    // Tombol nonaktif tidak boleh memicu klik
    tombolDiklik = false;
    tombol.setAktif(false);
    await tombol.picu('klik');
    pastikan(!tombolDiklik, 'Tombol nonaktif tidak boleh memproses klik');

    const input = new InputTeksWidget('Placeholder Nama', 'Budi');
    pastikan(input.getNilai() === 'Budi', 'Nilai awal input harus sesuai');
    input.setNilai('Siti');
    pastikan(input.getNilai() === 'Siti', 'Nilai input harus Siti');
    input.bersihkan();
    pastikan(input.getNilai() === '', 'Input harus kosong setelah bersihkan');

    const area = new AreaTeksWidget('Deskripsi...', 'Baris 1', 5);
    area.tambahBaris('Baris 2');
    pastikan(area.getNilai() === 'Baris 1\nBaris 2', 'Multiline teks area harus tersambung baris baru');
  });

  await uji('3.2 KotakCentang, TombolRadio, Dropdown, Tabel, Progres, Slider', async () => {
    const cb = new KotakCentangWidget('Ingat Saya', false);
    const hasilCentang = { berubah: false };
    cb.pasang('nilai_berubah', (evt) => {
      hasilCentang.berubah = evt.nilaiLogika === true;
    });
    await cb.setCentang(true);
    pastikan(cb.isCentang() === true, 'Kotak centang harus bernilai true');
    pastikan(hasilCentang.berubah === true, 'Event perubahan nilai kotak centang harus terpicu');

    // Radio button group
    const grup = new GrupRadio('metode_bayar');
    const r1 = new TombolRadioWidget('Tunai', 'tunai', 'metode_bayar');
    const r2 = new TombolRadioWidget('Kartu', 'kartu', 'metode_bayar');
    grup.tambah(r1);
    grup.tambah(r2);
    r1.setTerpilih(true);
    pastikan(grup.getTerpilih() === 'tunai', 'Grup radio harus bernilai tunai');
    r2.setTerpilih(true);
    pastikan(grup.getTerpilih() === 'kartu', 'Grup radio harus berganti ke kartu');
    pastikan(!r1.terpilih, 'Radio 1 harus tidak terpilih lagi');

    // Dropdown / Select
    const dropdown = new PilihanDropdownWidget(['Apel', 'Jeruk', 'Mangga'], 'Apel');
    dropdown.setTerpilih('Mangga');
    pastikan(dropdown.getTerpilih() === 'Mangga', 'Dropdown harus terpilih Mangga');

    // Tabel Widget
    const tabel = new TabelWidget(
      [{ id: 'id', judul: 'ID' }, { id: 'nama', judul: 'Nama' }],
      [{ id: 1, nama: 'Produk A' }]
    );
    tabel.tambahBaris({ id: 2, nama: 'Produk B' });
    pastikan(tabel.getData().length === 2, 'Tabel harus memiliki 2 baris');

    // Progres & Slider
    const progres = new IndikatorProgresWidget(50, 100);
    pastikan(progres.getPersentase() === 50, 'Persentase progres harus 50%');

    const slider = new SliderWidget(0, 100, 25);
    slider.setNilai(75);
    pastikan(slider.getNilai() === 75, 'Nilai slider harus 75');
  });

  // --- 4. LAYOUT SYSTEM ---
  await uji('4.1 Kolom, Baris, Grid, Stack, dan Wadah Gulir', async () => {
    const l1 = new LabelWidget('Label 1');
    const l2 = new LabelWidget('Label 2');
    const b1 = new TombolWidget('Tombol 1');

    const baris = new BarisLayout(10, 'awal');
    baris.tambahAnak(l1).tambahAnak(b1);
    pastikan(baris.anak.length === 2, 'Baris harus memiliki 2 anak');
    pastikan(l1.induk === baris, 'Induk elemen harus mengarah ke baris');

    const kolom = new KolomLayout(15, 'tengah');
    kolom.tambahAnak(baris).tambahAnak(l2);
    pastikan(kolom.anak.length === 2, 'Kolom harus berisi baris dan label 2');

    const grid = new GridLayout(3, 8);
    pastikan(grid.kolom === 3, 'Grid harus 3 kolom');

    const stack = new StackLayout();
    stack.tambahAnak(l1);
    pastikan(stack.jenis === 'stack', 'Jenis layout harus stack');

    const gulir = new WadahGulirWidget();
    gulir.tambahAnak(kolom);
    pastikan(gulir.jenis === 'gulir', 'Jenis wadah harus gulir');

    // Uji serialisasi pohon layout
    const serial = kolom.serialisasi();
    pastikan(serial.jenis === 'kolom', 'Serialisasi harus berjenis kolom');
    pastikan(serial.anak.length === 2, 'Anak serialisasi harus berjumlah 2');
  });

  // --- 5. MENUS & DIALOGS ---
  await uji('5.1 Bilah Menu, Item Menu, Toolbar, dan Dialog', async () => {
    const menuBar = new BilahMenu();
    const menuBerkas = new Menu('Berkas');
    let aksiDipanggil = false;

    const itemBuka = new ItemMenu('Buka', () => { aksiDipanggil = true; }, 'Ctrl+O');
    const pemisah = ItemMenu.buatPemisah();
    const itemKeluar = new ItemMenu('Keluar', undefined, 'Ctrl+Q');

    menuBerkas.tambahItem(itemBuka).tambahItem(pemisah).tambahItem(itemKeluar);
    menuBar.tambahMenu(menuBerkas);

    pastikan(menuBar.daftarMenu.length === 1, 'Bilah menu harus memiliki 1 menu utama');
    pastikan(menuBerkas.item.length === 3, 'Menu berkas harus memiliki 3 item termasuk separator');

    // Eksekusi aksi
    itemBuka.eksekusi();
    pastikan(aksiDipanggil, 'Aksi item menu harus terpanggil');

    // Toolbar
    const toolbar = new BilahAlat();
    toolbar.tambahAksi(itemBuka);
    pastikan(toolbar.daftarAksi.length === 1, 'Bilah alat harus memiliki 1 aksi');

    // Dialog Manager
    const dialogMgr = new PengelolaDialogGUI();
    dialogMgr.tampilkanPesan({ judul: 'Info', pesan: 'Pesan Berhasil' });
    const konfirmasi = dialogMgr.tampilkanKonfirmasi({ judul: 'Tanya', pesan: 'Yakin?' });
    pastikan(konfirmasi === true, 'Konfirmasi default harus true');

    const fileResult = dialogMgr.bukaDialogBerkas({ judul: 'Buka File' });
    pastikan(fileResult.dibatalkan === false, 'Dialog berkas tidak dibatalkan');
  });

  // --- 6. THEMES & ACCESSIBILITY ---
  await uji('6.1 Pengelola Tema dan Skema Kontras', async () => {
    const tema = new PengelolaTema('terang');
    let temaTerganti: string = '';
    tema.onTemaBerubah((skema) => {
      temaTerganti = skema.nama;
    });

    tema.setTema('gelap');
    pastikan(tema.getTemaSaatIni().nama === 'gelap', 'Tema aktif harus gelap');
    pastikan(temaTerganti === 'gelap', 'Listener tema harus menerima perubahan ke gelap');

    tema.setTema('kontras_tinggi');
    pastikan(tema.getTemaSaatIni().nama === 'kontras_tinggi', 'Tema aktif harus kontras_tinggi');

    // Aksesibilitas
    const tombol = new TombolWidget('Bantuan');
    tombol.setAksesibilitas({ peran: 'button', label: 'Tombol Bantuan Aplikasi', wajib: true });
    const aria = buatAtributAria(tombol.aksesibilitas);
    pastikan(aria['role'] === 'button', 'Role ARIA harus button');
    pastikan(aria['aria-label'] === 'Tombol Bantuan Aplikasi', 'aria-label harus sesuai');

    const shortcutMac = sesuaikanShortcutOS('Ctrl+S', 'darwin');
    pastikan(shortcutMac === 'Cmd+S', 'Shortcut macOS harus menggunakan Cmd+S');
  });

  // --- 7. FORM VALIDATION ---
  await uji('7.1 PengelolaFormGUI Validasi Field', async () => {
    const form = new PengelolaFormGUI();
    form.tambahAturan('email', { wajib: true, panjangMin: 5 });
    form.tambahAturan('usia', { wajib: true, nilaiMin: 17, nilaiMaks: 65 });

    // Uji data tidak sah
    const hasilTidakSah = form.validasi({ email: '', usia: 12 });
    pastikan(!hasilTidakSah.sah, 'Form dengan field kosong/dibawah batas usia harus tidak sah');
    pastikan(hasilTidakSah.daftarGalat.length === 2, 'Harus mendeteksi 2 galat');

    // Uji data sah
    const hasilSah = form.validasi({ email: 'pengembang@nusantara.org', usia: 28 });
    pastikan(hasilSah.sah, 'Form dengan data valid harus sah');
    pastikan(hasilSah.daftarGalat.length === 0, 'Daftar galat harus kosong');
  });

  // --- 8. PLATFORM ADAPTER & BRIDGE ---
  await uji('8.1 AdaptorHeadlessGUI & JembatanDesktopWebview', async () => {
    const headless = new AdaptorHeadlessGUI();
    await headless.inisialisasi({ idAplikasi: 'id.test', namaAplikasi: 'Test App' });

    const jendela = new JendelaGUI({ judul: 'Headless Window' });
    const label = new LabelWidget('Label Headless');
    jendela.setKonten(label);

    await headless.bukaJendela(jendela);
    const riwayat = headless.getRiwayatAksi();
    pastikan(riwayat.length >= 2, 'Riwayat aksi headless harus mencatat pembukaan jendela');

    const teksTree = headless.renderPohonTeks(jendela);
    pastikan(teksTree.includes('Headless Window'), 'Render teks harus memuat judul jendela');

    // IPC Bridge
    const bridge = new JembatanDesktopWebview();
    let pesanDiterima: any = null;
    bridge.langganan('saluran:utama', (muatan) => {
      pesanDiterima = muatan;
    });

    bridge.siarkan('saluran:utama', { aksi: 'pembaharuan', nilai: 100 });
    pastikan(pesanDiterima !== null && pesanDiterima.nilai === 100, 'Pesan IPC harus diterima');
  });

  // --- 9. CLI TEMPLATE GENERATOR ---
  await uji('9.1 Pendaftaran Template Proyek "desktop" di TemplateRegistry', async () => {
    const reg = new TemplateRegistry();
    pastikan(reg.apakahAda('desktop'), 'Template desktop harus terdaftar di TemplateRegistry');

    const tpl = reg.dapatkan('desktop');
    pastikan(tpl !== undefined, 'Definisi template desktop harus dapat diambil');
    pastikan(tpl!.kategori === 'aplikasi', 'Kategori template desktop harus aplikasi');
    pastikan(tpl!.persyaratanRuntime.includes('gui'), 'Persyaratan runtime harus menyertakan gui');

    const fileUtama = tpl!.berkas.find((b) => b.jalur === 'src/utama.nusantara');
    pastikan(fileUtama !== undefined, 'Template desktop harus memiliki file src/utama.nusantara');
    pastikan(fileUtama!.konten.includes('gunakan "gui" sebagai antarmuka'), 'File template harus mengimpor gui');
  });

  // --- 10. INTERPRETER EXECUTION SAMPLE PROGRAMS ---
  await uji('10.1 Eksekusi Skrip contoh/desktop/demo_desktop.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/desktop/demo_desktop.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Menginisialisasi Demo Aplikasi Desktop NUSANTARA...'), 'Harus mencetak log inisialisasi demo');
    pastikan(log.includes('Aplikasi Demo GUI berhasil disiapkan!'), 'Harus berhasil menyiapkan jendela dan widget');
    pastikan(log.includes('NUSANTARA Desktop Application v0.36.0'), 'Harus memuat judul jendela yang benar');
  });

  await uji('10.2 Eksekusi Skrip contoh/desktop/aplikasi_kasir.nusantara', async () => {
    const jalurBerkas = path.join(process.cwd(), 'contoh/desktop/aplikasi_kasir.nusantara');
    const kodeSumber = fs.readFileSync(jalurBerkas, 'utf-8');

    const penulis = new PenulisOutputBuffer();
    const interpreter = new Interpreter(penulis);
    interpreter.jalankanKode(kodeSumber);

    const log = penulis.ambilOutput();
    pastikan(log.includes('Memulai Sistem Kasir Desktop NUSANTARA...'), 'Harus mencetak inisialisasi kasir');
    pastikan(log.includes('Aplikasi Kasir Nusantara POS siap melayani transaksi.'), 'Harus siap melayani transaksi');
    pastikan(log.includes('Item berhasil ditambahkan: Buku Catatan Nusantara A5 (Subtotal: Rp 30000)'), 'Transaksi kasir harus menghitung subtotal dengan tepat');
  });

  console.log('='.repeat(70));
  console.log(`HASIL PENGUJIAN FASE 36: ${tesBerhasil}/${totalTes} LULUS`);
  if (!lulusSemua) {
    console.error('Pengujian Fase 36 GAGAL!');
    process.exit(1);
  } else {
    console.log('Semua pengujian Fase 36 BERHASIL 100%!');
  }
}

main().catch((err) => {
  console.error('Galat fatal dalam pengujian Fase 36:', err);
  process.exit(1);
});
